import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

export interface CopilotContext {
  role: string;
  applications?: unknown[];
  savedJobs?: unknown[];
  reminders?: unknown[];
  activities?: unknown[];
  candidates?: unknown[];
  templates?: unknown[];
  stats?: {
    total: number;
    byStatus: Record<string, number>;
    responseRate: number;
    avgDaysToInterview: number;
    oldestFollowUpDays: number;
  };
}

export async function gatherContext(userId: string, role: string): Promise<CopilotContext> {
  if (role === "EMPLOYER") {
    return gatherEmployerContext(userId);
  }
  return gatherJobSeekerContext(userId);
}

async function gatherJobSeekerContext(userId: string) {
  const [applications, savedJobs, reminders, activities, recentApps] = await Promise.all([
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, company: true, role: true, status: true, source: true,
        notes: true, contactName: true, contactEmail: true, link: true,
        createdAt: true, updatedAt: true,
      },
    }),
    prisma.savedJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.reminder.findMany({
      where: { userId, isCompleted: false },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.jobApplication.findMany({
      where: { userId, status: { in: ["APPLIED", "WISHLIST"] } },
      orderBy: { updatedAt: "asc" },
      take: 5,
      select: { company: true, role: true, updatedAt: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  applications.forEach(a => { byStatus[a.status] = (byStatus[a.status] ?? 0) + 1; });

  const total = applications.length;
  const responded = applications.filter(a => !["UNAPPLIED", "WISHLIST"].includes(a.status)).length;
  const interviewApps = applications.filter(a => ["INTERVIEW", "OFFER", "REJECTED"].includes(a.status));
  const avgDays = interviewApps.length > 0
    ? Math.round(interviewApps.reduce((s, a) => s + differenceInDays(new Date(), new Date(a.createdAt)), 0) / interviewApps.length)
    : 0;

  const oldestDays = recentApps.length > 0
    ? Math.max(...recentApps.map(a => differenceInDays(new Date(), new Date(a.updatedAt))))
    : 0;

  return {
    role: "JOB_SEEKER",
    applications,
    savedJobs,
    reminders,
    activities,
    stats: {
      total,
      byStatus,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      avgDaysToInterview: avgDays,
      oldestFollowUpDays: oldestDays,
    },
  };
}

async function gatherEmployerContext(userId: string) {
  const [candidates, templates, activities] = await Promise.all([
    prisma.candidate.findMany({
      where: { employerId: userId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true, name: true, email: true, positionApplied: true, status: true,
        rating: true, tags: true, notes: true, appliedAt: true, updatedAt: true,
      },
    }),
    prisma.emailTemplate.findMany({
      where: { employerId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.candidateActivity.findMany({
      where: { candidate: { employerId: userId } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const byStatus: Record<string, number> = {};
  candidates.forEach(c => { byStatus[c.status] = (byStatus[c.status] ?? 0) + 1; });

  return {
    role: "EMPLOYER",
    candidates,
    templates,
    activities,
    stats: {
      total: candidates.length,
      byStatus,
      responseRate: 0,
      avgDaysToInterview: 0,
      oldestFollowUpDays: 0,
    },
  };
}
