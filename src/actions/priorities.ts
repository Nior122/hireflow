'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";

export interface PriorityItem {
  id: string;
  type: "follow_up" | "interview" | "new_match" | "offer" | "deadline" | "recruiter_reply";
  icon: string; // emoji
  title: string;
  description: string;
  link?: string;
  urgency: "high" | "medium" | "low";
  createdAt: string;
}

export async function getDashboardPriorities(): Promise<ActionResponse<PriorityItem[]>> {
  try {
    const user = await createOrGetUser();
    const priorities: PriorityItem[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Upcoming interviews (within 48 hours)
    const upcomingInterviews = await prisma.interview.findMany({
      where: {
        userId: user.id,
        status: "SCHEDULED",
        scheduledAt: { gte: now, lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) }
      },
      orderBy: { scheduledAt: "asc" },
      take: 3
    });
    for (const interview of upcomingInterviews) {
      priorities.push({
        id: `interview-${interview.id}`,
        type: "interview",
        icon: "🎤",
        title: `Interview ${interview.scheduledAt ? "tomorrow" : "soon"}`,
        description: `${interview.interviewType.replace(/_/g, " ")} at ${interview.company} for ${interview.position}`,
        link: interview.applicationId ? `/dashboard/jobs/${interview.applicationId}` : undefined,
        urgency: "high",
        createdAt: interview.scheduledAt?.toISOString() || now.toISOString()
      });
    }

    // 2. Applications needing follow-up (applied > 7 days ago, no recent activity)
    const staleApps = await prisma.jobApplication.findMany({
      where: {
        userId: user.id,
        status: "APPLIED",
        updatedAt: { lt: sevenDaysAgo }
      },
      orderBy: { updatedAt: "asc" },
      take: 3
    });
    for (const app of staleApps) {
      priorities.push({
        id: `followup-${app.id}`,
        type: "follow_up",
        icon: "🔥",
        title: `Follow up with ${app.company}`,
        description: `Applied for ${app.role} — no update in over 7 days`,
        link: `/dashboard/jobs/${app.id}`,
        urgency: "medium",
        createdAt: app.updatedAt.toISOString()
      });
    }

    // 3. Offers received
    const offers = await prisma.jobApplication.findMany({
      where: {
        userId: user.id,
        status: "OFFER"
      },
      take: 2
    });
    for (const offer of offers) {
      priorities.push({
        id: `offer-${offer.id}`,
        type: "offer",
        icon: "🏆",
        title: `Offer from ${offer.company}`,
        description: `You have an offer for ${offer.role}!`,
        link: `/dashboard/jobs/${offer.id}`,
        urgency: "high",
        createdAt: offer.updatedAt.toISOString()
      });
    }

    // 4. New discovered jobs (from Gmail)
    const newJobs = await prisma.discoveredJob.findMany({
      where: {
        userId: user.id,
        status: "NEW",
        createdAt: { gte: threeDaysAgo }
      },
      orderBy: { createdAt: "desc" },
      take: 3
    });
    for (const job of newJobs) {
      priorities.push({
        id: `match-${job.id}`,
        type: "new_match",
        icon: "🎯",
        title: `New job: ${job.title}`,
        description: `${job.company} — Discovered from your Gmail`,
        link: "/dashboard/discover",
        urgency: "low",
        createdAt: job.createdAt.toISOString()
      });
    }

    // 5. Recruiter replies (recent recruiter emails)
    const recruiterEmails = await prisma.emailMessage.findMany({
      where: {
        userId: user.id,
        category: "RECRUITER",
        receivedAt: { gte: threeDaysAgo }
      },
      orderBy: { receivedAt: "desc" },
      take: 2
    });
    for (const email of recruiterEmails) {
      priorities.push({
        id: `recruiter-${email.id}`,
        type: "recruiter_reply",
        icon: "📩",
        title: `Recruiter: ${email.sender || "Unknown"}`,
        description: email.subject || "New recruiter message",
        link: "/dashboard/inbox",
        urgency: "medium",
        createdAt: email.receivedAt?.toISOString() || now.toISOString()
      });
    }

    // 6. Pending follow-up actions
    const pendingActions = await prisma.followUpAction.findMany({
      where: {
        userId: user.id,
        status: "PENDING",
        dueDate: { lte: tomorrow }
      },
      orderBy: { dueDate: "asc" },
      take: 3
    });
    for (const action of pendingActions) {
      priorities.push({
        id: `action-${action.id}`,
        type: "follow_up",
        icon: "⚠️",
        title: action.title,
        description: action.description || "Action needed",
        link: action.jobApplicationId ? `/dashboard/jobs/${action.jobApplicationId}` : undefined,
        urgency: action.dueDate <= now ? "high" : "medium",
        createdAt: action.dueDate.toISOString()
      });
    }

    // Sort by urgency then recency
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    priorities.sort((a, b) => {
      const urgDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgDiff !== 0) return urgDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return { success: true, data: priorities.slice(0, 8) };
  } catch (error) {
    console.error("[priorities] getDashboardPriorities error:", error);
    return { success: false, error: "Failed to load priorities" };
  }
}
