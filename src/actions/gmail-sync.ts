"use server";

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";
import { runGmailSyncForUser, type GmailSyncSummary } from "@/lib/gmail/sync-engine";
import { deterministicClassify, inferCompanyAndRole } from "@/lib/gmail/email-utils";

interface InboxEmailRecord {
  id: string;
  gmailMessageId: string;
  sender: string | null;
  senderEmail: string | null;
  subject: string | null;
  snippet: string | null;
  body: string | null;
  receivedAt: Date | null;
  isRead: boolean;
  category: string | null;
  confidence: number | null;
  jobRelated: boolean;
  applicationRelated: boolean;
  interviewRelated: boolean;
  rejectionRelated: boolean;
  offerRelated: boolean;
  urgency: number | null;
  importance: number | null;
  action: string | null;
  replyDraft: string | null;
  createdAt: Date;
}

function revalidateInbox() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  revalidatePath("/dashboard/settings");
}

export async function syncGmailInbox(options?: {
  forceFullSync?: boolean;
}): Promise<ActionResponse<GmailSyncSummary>> {
  try {
    const user = await createOrGetUser();
    const data = await runGmailSyncForUser(user.id, {
      forceFullSync: options?.forceFullSync,
    });
    revalidateInbox();
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[gmail-sync] fatal error:", message);
    if (message.includes("Gmail not connected")) {
      return { success: false, error: message };
    }
    if (message.includes("Failed to fetch Gmail messages")) {
      return { success: false, error: "Failed to fetch Gmail messages. Please reconnect Gmail." };
    }
    return { success: false, error: "Unable to sync Gmail right now. Please try again." };
  }
}

export async function getInboxStats(): Promise<ActionResponse<Record<string, number>>> {
  try {
    const user = await createOrGetUser();

    const stats = await prisma.emailMessage.groupBy({
      by: ["category"],
      where: { userId: user.id },
      _count: true,
    });

    const allMailCount = await prisma.emailMessage.count({ where: { userId: user.id } });

    const result: Record<string, number> = {
      ALL: allMailCount,
      JOB_OPPORTUNITY: 0,
      APPLICATIONS: 0,
      INTERVIEWS: 0,
      OFFERS: 0,
      REJECTIONS: 0,
      RECRUITERS: 0,
      NETWORKING: 0,
      CAREER: 0,
      IMPORTANT: 0,
      OTHER: 0,
    };

    for (const stat of stats) {
      if (stat.category && stat.category in result) {
        result[stat.category] = stat._count;
      } else if (stat.category) {
        result.OTHER += stat._count;
      }
    }

    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to load stats." };
  }
}

export async function getInboxEmails(options?: {
  category?: string;
  page?: number;
  pageSize?: number;
  jobRelatedOnly?: boolean;
}): Promise<ActionResponse<{ emails: InboxEmailRecord[]; total: number; hasMore: boolean }>> {
  try {
    const user = await createOrGetUser();
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where = {
      userId: user.id,
      ...(options?.category && options.category !== "ALL" ? { category: options.category } : {}),
      ...(options?.jobRelatedOnly ? { jobRelated: true } : {}),
    };

    const [emails, total] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.emailMessage.count({ where }),
    ]);

    return {
      success: true,
      data: {
        emails: emails as InboxEmailRecord[],
        total,
        hasMore: skip + emails.length < total,
      },
    };
  } catch {
    return { success: false, error: "Failed to load inbox emails." };
  }
}

export async function getDiscoveredJobs(): Promise<ActionResponse<{
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string | null;
  remoteType: string | null;
  status: string;
  createdAt: Date;
  sourceEmail?: { subject: string | null; sender: string | null; receivedAt: Date | null } | null;
}[]>> {
  try {
    const user = await createOrGetUser();
    const jobs = await prisma.discoveredJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        sourceEmail: {
          select: { subject: true, sender: true, receivedAt: true },
        },
      },
    });
    return { success: true, data: jobs };
  } catch {
    return { success: false, error: "Failed to load discovered jobs." };
  }
}

export async function updateDiscoveredJobStatus(
  jobId: string,
  status: "SAVED" | "DISMISSED" | "APPLIED" | "NEW"
): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const updated = await prisma.discoveredJob.updateMany({
      where: { id: jobId, userId: user.id },
      data: { status },
    });
    if (updated.count === 0) return { success: false, error: "Job not found." };
    revalidateInbox();
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update job status." };
  }
}

export async function getGmailSyncStatus(): Promise<ActionResponse<{
  connected: boolean;
  lastSyncedAt: Date | null;
  emailCount: number;
  jobsDiscovered: number;
}>> {
  try {
    const user = await createOrGetUser();
    const [token, emailCount, jobsDiscovered] = await Promise.all([
      prisma.gmailToken.findUnique({ where: { userId: user.id }, select: { lastSyncedAt: true } }),
      prisma.emailMessage.count({ where: { userId: user.id } }),
      prisma.discoveredJob.count({ where: { userId: user.id } }),
    ]);

    return {
      success: true,
      data: {
        connected: !!token,
        lastSyncedAt: token?.lastSyncedAt ?? null,
        emailCount,
        jobsDiscovered,
      },
    };
  } catch {
    return { success: false, error: "Failed to get sync status." };
  }
}

export async function reprocessGmailEmails(): Promise<ActionResponse<{
  processed: number;
  jobsDiscovered: number;
  applicationsDiscovered: number;
  interviewsDiscovered: number;
}>> {
  try {
    const user = await createOrGetUser();

    const emails = await prisma.emailMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    let processed = 0;
    let jobsDiscovered = 0;
    let applicationsDiscovered = 0;
    let interviewsDiscovered = 0;

    for (const msg of emails) {
      const subject = msg.subject || "";
      const snippet = msg.snippet || "";
      const limitedBody = (msg.body || "").slice(0, 2500);
      const sender = msg.sender || "";
      const senderEmail = msg.senderEmail || "";

      const classification = deterministicClassify(`${subject} ${snippet} ${limitedBody}`);

      await prisma.emailMessage.update({
        where: { id: msg.id },
        data: {
          category: classification.category,
          jobRelated: classification.jobRelated,
          applicationRelated: classification.applicationRelated,
          interviewRelated: classification.interviewRelated,
          rejectionRelated: classification.rejectionRelated,
          offerRelated: classification.offerRelated,
        },
      });

      const { company: inferredCompany, role: inferredRole } = inferCompanyAndRole(
        classification.company,
        classification.role,
        subject,
        sender,
        senderEmail
      );

      if (classification.category === "JOB_OPPORTUNITY") {
        if (inferredCompany && inferredRole) {
          const existing = await prisma.discoveredJob.findFirst({
            where: { userId: user.id, company: { equals: inferredCompany, mode: "insensitive" } },
          });
          if (!existing) {
            await prisma.discoveredJob.create({
              data: {
                userId: user.id,
                sourceEmailId: msg.id,
                title: inferredRole,
                company: inferredCompany,
                status: "NEW",
              },
            });
            jobsDiscovered++;
          }
        }
      } else if (classification.category === "APPLICATIONS") {
        if (inferredCompany) {
          const app = await prisma.jobApplication.findFirst({
            where: { userId: user.id, company: { equals: inferredCompany, mode: "insensitive" } },
          });
          if (!app) {
            await prisma.jobApplication.create({
              data: {
                userId: user.id,
                company: inferredCompany,
                role: inferredRole || "Software Role",
                status: "APPLIED",
                source: "Gmail Reprocess",
                sourceEmailId: msg.id,
              },
            });
            applicationsDiscovered++;
          }
        }
      } else if (classification.category === "INTERVIEWS") {
        if (inferredCompany) {
          let app = await prisma.jobApplication.findFirst({
            where: { userId: user.id, company: { equals: inferredCompany, mode: "insensitive" } },
          });
          if (app) {
            await prisma.jobApplication.update({ where: { id: app.id }, data: { status: "INTERVIEW" } });
          } else {
            app = await prisma.jobApplication.create({
              data: {
                userId: user.id,
                company: inferredCompany,
                role: inferredRole || "Software Role",
                status: "INTERVIEW",
                source: "Gmail Reprocess",
                sourceEmailId: msg.id,
              },
            });
            applicationsDiscovered++;
          }
          interviewsDiscovered++;
        }
      }
      processed++;
    }

    revalidateInbox();
    return {
      success: true,
      data: { processed, jobsDiscovered, applicationsDiscovered, interviewsDiscovered },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reprocess emails" };
  }
}
