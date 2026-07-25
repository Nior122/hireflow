'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";

// ─── Resume CRUD ────────────────────────────────────────────────

export async function getResumes(): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const resumes = await prisma.resume.findMany({
      where: { userId: user.id },
      include: { sections: { orderBy: { order: "asc" } }, versions: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { updatedAt: "desc" },
    });
    return { success: true, data: resumes };
  } catch { return { success: false, error: "Failed to load resumes" }; }
}

export async function createResume(data?: { name?: string }): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const count = await prisma.resume.count({ where: { userId: user.id } });

    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        name: data?.name ?? `Resume ${count + 1}`,
        sections: {
          create: [
            { type: "EXPERIENCE", title: "Work Experience", order: 0, content: { items: [] } },
            { type: "EDUCATION", title: "Education", order: 1, content: { items: [] } },
            { type: "SKILLS", title: "Skills", order: 2, content: { items: [] } },
          ],
        },
      },
      include: { sections: { orderBy: { order: "asc" } }, versions: true },
    });

    await prisma.resumeVersion.create({
      data: {
        resumeId: resume.id,
        versionNumber: 1,
        notes: "Initial version",
        snapshot: JSON.parse(JSON.stringify(resume)),
      },
    });

    revalidatePath("/dashboard/resume");
    return { success: true, data: resume };
  } catch { return { success: false, error: "Failed to create resume" }; }
}

export async function updateResume(id: string, data: { name?: string; title?: string; summary?: string; atsScore?: number }): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.resume.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, error: "Resume not found" };

    const resume = await prisma.resume.update({ where: { id }, data });
    revalidatePath("/dashboard/resume");
    return { success: true, data: resume };
  } catch { return { success: false, error: "Failed to update" }; }
}

export async function deleteResume(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.resume.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/dashboard/resume");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete" }; }
}

export async function duplicateResume(id: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const original = await prisma.resume.findFirst({
      where: { id, userId: user.id },
      include: { sections: { orderBy: { order: "asc" } } },
    });
    if (!original) return { success: false, error: "Resume not found" };

    const dup = await prisma.resume.create({
      data: {
        userId: user.id,
        name: `${original.name} (Copy)`,
        title: original.title,
        summary: original.summary,
        sections: {
          create: original.sections.map(s => ({ type: s.type, title: s.title, order: s.order, content: s.content })),
        },
      },
      include: { sections: { orderBy: { order: "asc" } }, versions: true },
    });

    revalidatePath("/dashboard/resume");
    return { success: true, data: dup };
  } catch { return { success: false, error: "Failed to duplicate" }; }
}

export async function setDefaultResume(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.resume.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await prisma.resume.updateMany({ where: { id, userId: user.id }, data: { isDefault: true } });
    revalidatePath("/dashboard/resume");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to set default" }; }
}

// ─── Sections CRUD ──────────────────────────────────────────────

export async function updateSection(id: string, data: { title?: string; content?: unknown; order?: number }): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const section = await prisma.resumeSection.findUnique({
      where: { id },
      select: { resume: { select: { userId: true } } },
    });
    if (!section) return { success: false, error: "Section not found" };
    if (section.resume.userId !== user.id) return { success: false, error: "Not authorized" };

    const updated = await prisma.resumeSection.update({ where: { id }, data: data as any });
    revalidatePath("/dashboard/resume");
    return { success: true, data: updated };
  } catch { return { success: false, error: "Failed to update section" }; }
}

export async function addSection(resumeId: string, type: string, title: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const resume = await prisma.resume.findUnique({ where: { id: resumeId }, select: { userId: true } });
    if (!resume) return { success: false, error: "Resume not found" };
    if (resume.userId !== user.id) return { success: false, error: "Not authorized" };

    const maxOrder = await prisma.resumeSection.aggregate({ where: { resumeId }, _max: { order: true } });
    const section = await prisma.resumeSection.create({
      data: { resumeId, type: type as any, title, order: (maxOrder._max.order ?? -1) + 1, content: { items: [] } },
    });
    revalidatePath("/dashboard/resume");
    return { success: true, data: section };
  } catch { return { success: false, error: "Failed to add section" }; }
}

export async function deleteSection(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const section = await prisma.resumeSection.findUnique({
      where: { id },
      select: { resume: { select: { userId: true } } },
    });
    if (!section) return { success: false, error: "Section not found" };
    if (section.resume.userId !== user.id) return { success: false, error: "Not authorized" };

    await prisma.resumeSection.delete({ where: { id } });
    revalidatePath("/dashboard/resume");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete section" }; }
}

export async function reorderSections(sectionIds: string[]): Promise<ActionResponse<void>> {
  try {
    await prisma.$transaction(
      sectionIds.map((id, index) =>
        prisma.resumeSection.update({ where: { id }, data: { order: index } })
      )
    );
    revalidatePath("/dashboard/resume");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to reorder" }; }
}

// ─── Versions ───────────────────────────────────────────────────

export async function createVersion(resumeId: string, notes?: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      include: { sections: { orderBy: { order: "asc" } } },
    });
    if (!resume) return { success: false, error: "Resume not found" };

    const maxVersion = await prisma.resumeVersion.aggregate({ where: { resumeId }, _max: { versionNumber: true } });
    const version = await prisma.resumeVersion.create({
      data: {
        resumeId,
        versionNumber: (maxVersion._max.versionNumber ?? 0) + 1,
        notes,
        snapshot: JSON.parse(JSON.stringify(resume)),
      },
    });
    return { success: true, data: version };
  } catch { return { success: false, error: "Failed to create version" }; }
}

export async function getVersions(resumeId: string): Promise<ActionResponse<any[]>> {
  try {
    const versions = await prisma.resumeVersion.findMany({ where: { resumeId }, orderBy: { createdAt: "desc" } });
    return { success: true, data: versions };
  } catch { return { success: false, error: "Failed to load versions" }; }
}

export async function restoreVersion(versionId: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const version = await prisma.resumeVersion.findUnique({
      where: { id: versionId },
      select: { resumeId: true, resume: { select: { userId: true } } },
    });
    if (!version) return { success: false, error: "Version not found" };
    if (version.resume.userId !== user.id) return { success: false, error: "Not authorized" };

    const snapshot = version.snapshot as any;
    await prisma.resume.update({
      where: { id: version.resumeId },
      data: { name: snapshot.name, title: snapshot.title, summary: snapshot.summary },
    });

    if (snapshot.sections && Array.isArray(snapshot.sections)) {
      await prisma.resumeSection.deleteMany({ where: { resumeId: version.resumeId } });
      for (const section of snapshot.sections) {
        await prisma.resumeSection.create({
          data: { resumeId: version.resumeId, type: section.type, title: section.title, order: section.order, content: section.content },
        });
      }
    }

    revalidatePath("/dashboard/resume");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to restore version" }; }
}

// ─── Cover Letters ──────────────────────────────────────────────

export async function getCoverLetters(): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const letters = await prisma.coverLetter.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return { success: true, data: letters };
  } catch { return { success: false, error: "Failed to load cover letters" }; }
}

export async function createCoverLetter(data: { company: string; position: string; content: string; resumeId?: string }): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const letter = await prisma.coverLetter.create({
      data: { userId: user.id, ...data, resumeId: data.resumeId ?? null },
    });
    revalidatePath("/dashboard/resume");
    return { success: true, data: letter };
  } catch { return { success: false, error: "Failed to save cover letter" }; }
}

export async function deleteCoverLetter(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.coverLetter.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/dashboard/resume");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete" }; }
}
