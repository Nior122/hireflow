'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { logActivity } from "@/actions/activities";
import { createApplicationSchema, updateApplicationSchema, type ApplicationCard, type ActionResponse, type ApplicationStatus } from "@/lib/types";
import { logger } from "@/lib/monitoring/logger";
import { extractCareerMemory } from "@/actions/memory-service";

export async function getApplications(): Promise<ActionResponse<ApplicationCard[]>> {
  try {
    const user = await createOrGetUser();
    const applications = await prisma.jobApplication.findMany({
      where: { userId: user.id },
      orderBy: [{ status: "asc" }, { position: "asc" }],
    });
    return { success: true, data: applications as ApplicationCard[] };
  } catch (e) {
    logger.error("Failed to fetch applications", { error: e instanceof Error ? e.message : "Unknown" });
    return { success: false, error: "Failed to fetch applications" };
  }
}

export async function createApplication(formData: FormData): Promise<ActionResponse<ApplicationCard>> {
  try {
    const user = await createOrGetUser();
    const raw = Object.fromEntries(formData);
    const parsed = createApplicationSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const { status = "UNAPPLIED", ...data } = parsed.data;
    const lastApp = await prisma.jobApplication.findFirst({ where: { userId: user.id, status }, orderBy: { position: "desc" }, select: { position: true } });
    const application = await prisma.jobApplication.create({
      data: { ...data, status, position: (lastApp?.position ?? -1) + 1, userId: user.id },
    });
    
    // Background memory extraction
    const fakeReq = { createOrGetUser: async () => ({ id: user.id }) };
    void fakeReq;
    extractCareerMemory(`Applied for ${application.role} at ${application.company}. ${application.notes ? "Notes: " + application.notes : ""}`, "APPLICATION").catch(e => console.error("[app] memory extract error", e));

    await logActivity(user.id, "APPLICATION_CREATED", `Created application: ${application.role} at ${application.company}`, application.id);
    revalidatePath("/dashboard");
    return { success: true, data: application as ApplicationCard };
  } catch (e) {
    logger.error("Failed to create application", { error: e instanceof Error ? e.message : "Unknown" });
    return { success: false, error: "Failed to create application" };
  }
}

export async function updateApplication(id: string, formData: FormData): Promise<ActionResponse<ApplicationCard>> {
  try {
    const user = await createOrGetUser();
    const raw = Object.fromEntries(formData);
    const parsed = updateApplicationSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, error: "Application not found" };
    const application = await prisma.jobApplication.update({ where: { id }, data: parsed.data });

    // Log relevant changes
    if (parsed.data.notes && parsed.data.notes !== existing.notes) {
      await logActivity(user.id, "NOTE_UPDATED", `Updated notes for ${existing.company}`, id);
      const fakeReq = { createOrGetUser: async () => ({ id: user.id }) };
      void fakeReq;
      extractCareerMemory(`Notes for ${existing.role} at ${existing.company}: ${parsed.data.notes}`, "APPLICATION").catch(e => console.error("[app] memory extract error", e));
    }
    if (parsed.data.status && parsed.data.status !== existing.status) {
      await logActivity(user.id, "STATUS_CHANGED", `Status changed to ${parsed.data.status} for ${existing.company}`, id);
    }

    revalidatePath("/dashboard");
    return { success: true, data: application as ApplicationCard };
  } catch { return { success: false, error: "Failed to update application" }; }
}

export async function deleteApplication(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, error: "Application not found" };
    await prisma.jobApplication.delete({ where: { id } });
    await prisma.jobApplication.updateMany({ where: { userId: user.id, status: existing.status, position: { gt: existing.position } }, data: { position: { decrement: 1 } } });
    await logActivity(user.id, "APPLICATION_DELETED", `Deleted application: ${existing.role} at ${existing.company}`, id);
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete application" }; }
}

export async function moveApplication(id: string, newStatus: ApplicationStatus, newPosition: number): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const app = await prisma.jobApplication.findFirst({ where: { id, userId: user.id } });
    if (!app) return { success: false, error: "Application not found" };

    if (app.status === newStatus) {
      const columnApps = await prisma.jobApplication.findMany({ where: { userId: user.id, status: newStatus }, orderBy: { position: "asc" } });
      const reordered = columnApps.filter((a: { id: string }) => a.id !== id);
      const clampedPosition = Math.min(newPosition, reordered.length);
      reordered.splice(clampedPosition, 0, app);
      await prisma.$transaction(reordered.map((a: { id: string }, index: number) => prisma.jobApplication.update({ where: { id: a.id }, data: { position: index } })));
    } else {
      // Wrap cross-column move in a transaction to ensure atomicity
      await prisma.$transaction([
        prisma.jobApplication.updateMany({
          where: { userId: user.id, status: app.status, position: { gt: app.position } },
          data: { position: { decrement: 1 } }
        }),
        prisma.jobApplication.updateMany({
          where: { userId: user.id, status: newStatus, position: { gte: newPosition } },
          data: { position: { increment: 1 } }
        }),
        prisma.jobApplication.update({
          where: { id },
          data: { status: newStatus, position: newPosition }
        }),
      ]);
      await logActivity(user.id, "STATUS_CHANGED", `Moved ${app.company} from ${app.status} to ${newStatus}`, id);
    }
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to move application" }; }
}
