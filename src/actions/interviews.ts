'use server';

import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@/lib/prisma";
import type { InterviewStatus } from "@prisma/client";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getCalendarStatus } from "./calendar";
import { extractCareerMemory } from "@/actions/memory-service";

// ─── Interviews CRUD ────────────────────────────────────────────

export async function getInterviews(): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const interviews = await prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { practices: { orderBy: { createdAt: "desc" }, take: 5 }, questions: true },
    });
    return { success: true, data: interviews };
  } catch { return { success: false, error: "Failed to load interviews" }; }
}

export async function createInterview(data: {
  company: string; position: string; interviewType?: string; interviewRound?: number;
  scheduledAt?: string; duration?: number; location?: string; meetingLink?: string;
  interviewerName?: string; interviewerEmail?: string; timezone?: string; applicationId?: string;
}): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const interview = await prisma.interview.create({
      data: {
        userId: user.id,
        company: data.company,
        position: data.position,
        interviewType: (data.interviewType as "PHONE_SCREEN" | "TECHNICAL" | "HR" | "BEHAVIORAL" | "SYSTEM_DESIGN" | "PAIR_PROGRAMMING" | "MANAGER_ROUND" | "EXECUTIVE" | "FINAL_ROUND" | "ASSESSMENT") ?? "TECHNICAL",
        interviewRound: data.interviewRound ?? 1,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        duration: data.duration ?? 60,
        location: data.location ?? null,
        meetingLink: data.meetingLink ?? null,
        interviewerName: data.interviewerName ?? null,
        interviewerEmail: data.interviewerEmail ?? null,
        timezone: data.timezone ?? null,
        applicationId: data.applicationId ?? null,
      },
    });

    // Sync with Calendar if connected
    if (data.scheduledAt) {
      const calStatus = await getCalendarStatus();
      if (calStatus.success && calStatus.data?.connected) {
        const start = new Date(data.scheduledAt);
        const end = new Date(start.getTime() + (data.duration ?? 60) * 60000);
        
        const calRes = await createCalendarEvent(
          `Interview: ${data.company} - ${data.position}`,
          `Interview with ${data.company}\nType: ${data.interviewType ?? "TECHNICAL"}\nRound: ${data.interviewRound ?? 1}\nLocation: ${data.location ?? "TBD"}`,
          start.toISOString(),
          end.toISOString(),
          data.interviewerEmail
        );

        if (calRes.success && calRes.data) {
          await prisma.interview.update({
            where: { id: interview.id },
            data: { calendarEventId: calRes.data.id, meetingLink: calRes.data.hangoutLink ?? data.meetingLink }
          });
        }
      }
    }

    revalidatePath("/dashboard/interviews");
    return { success: true, data: interview };
  } catch { return { success: false, error: "Failed to create interview" }; }
}

export async function updateInterview(id: string, data: {
  status?: string; notes?: string; scheduledAt?: string; location?: string;
  meetingLink?: string; interviewerName?: string;
}): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.interview.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, error: "Interview not found" };
    const update: Prisma.InterviewUpdateInput = {};
    if (data.status) update.status = data.status as InterviewStatus;
    if (data.notes) update.notes = data.notes;
    if (data.scheduledAt) update.scheduledAt = new Date(data.scheduledAt);
    if (data.location !== undefined) update.location = data.location;
    if (data.meetingLink !== undefined) update.meetingLink = data.meetingLink;
    if (data.interviewerName !== undefined) update.interviewerName = data.interviewerName;
    
    // Check if we need to update calendar
    if (existing.calendarEventId && (data.scheduledAt || data.status === "CANCELLED" || data.status === "RESCHEDULED")) {
      const calStatus = await getCalendarStatus();
      if (calStatus.success && calStatus.data?.connected) {
        if (data.status === "CANCELLED") {
          await deleteCalendarEvent(existing.calendarEventId);
          update.calendarEventId = null;
        } else {
          // It's an update/reschedule
          const start = new Date(data.scheduledAt ?? existing.scheduledAt!);
          const end = new Date(start.getTime() + (existing.duration ?? 60) * 60000);
          await updateCalendarEvent(
            existing.calendarEventId,
            `Interview: ${existing.company} - ${existing.position}${data.status === "RESCHEDULED" ? " (Rescheduled)" : ""}`,
            `Interview with ${existing.company}\nType: ${existing.interviewType}\nRound: ${existing.interviewRound}\nLocation: ${data.location ?? existing.location ?? "TBD"}`,
            start.toISOString(),
            end.toISOString(),
            existing.interviewerEmail ?? undefined
          );
        }
      }
    }

    const interview = await prisma.interview.update({ where: { id }, data: update });
    
    // Background memory extraction from interview notes
    if (data.notes && data.notes !== existing.notes) {
      const fakeReq = { createOrGetUser: async () => ({ id: user.id }) };
      void fakeReq;
      extractCareerMemory(`Interview with ${interview.company} for ${interview.position} role. Notes: ${data.notes}`, "INTERVIEW").catch(e => console.error("[interview] memory extract error", e));
    }
    
    revalidatePath("/dashboard/interviews");
    return { success: true, data: interview };
  } catch { return { success: false, error: "Failed to update" }; }
}

export async function deleteInterview(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.interview.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, error: "Interview not found" };

    if (existing.calendarEventId) {
      const calStatus = await getCalendarStatus();
      if (calStatus.success && calStatus.data?.connected) {
        await deleteCalendarEvent(existing.calendarEventId);
      }
    }

    await prisma.interview.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/dashboard/interviews");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete" }; }
}

// ─── Practice Sessions ──────────────────────────────────────────

export async function savePractice(data: {
  interviewId?: string; company?: string; role?: string; category: string;
  difficulty: string; question: string; userAnswer: string; aiFeedback?: unknown; score?: number;
  jobApplicationId?: string;
}): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const practice = await prisma.interviewPractice.create({
      data: {
        userId: user.id,
        interviewId: data.interviewId ?? null,
        jobApplicationId: data.jobApplicationId ?? null,
        company: data.company ?? null,
        role: data.role ?? null,
        category: data.category,
        difficulty: data.difficulty,
        question: data.question,
        userAnswer: data.userAnswer,
        aiFeedback: (data.aiFeedback ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        score: data.score ?? null,
      },
    });
    revalidatePath("/dashboard/interviews");
    return { success: true, data: practice };
  } catch { return { success: false, error: "Failed to save practice" }; }
}

export async function getPractices(): Promise<ActionResponse<any[]>> {
  try {
    const user = await createOrGetUser();
    const practices = await prisma.interviewPractice.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { success: true, data: practices };
  } catch { return { success: false, error: "Failed to load practices" }; }
}

// ─── Interview Notes ────────────────────────────────────────────

export async function getInterviewNotes(interviewId: string): Promise<ActionResponse<any[]>> {
  try {
    const notes = await prisma.interviewNote.findMany({ where: { interviewId }, orderBy: { createdAt: "desc" } });
    return { success: true, data: notes };
  } catch { return { success: false, error: "Failed to load notes" }; }
}

export async function saveInterviewNote(interviewId: string, data: { type: string; title: string; content: string }): Promise<ActionResponse<any>> {
  try {
    const existing = await prisma.interviewNote.findFirst({
      where: { interviewId, type: data.type, title: data.title },
    });
    const note = existing
      ? await prisma.interviewNote.update({ where: { id: existing.id }, data: { content: data.content } })
      : await prisma.interviewNote.create({ data: { interviewId, type: data.type, title: data.title, content: data.content } });
    return { success: true, data: note };
  } catch {
    const note = await prisma.interviewNote.create({
      data: { interviewId, type: data.type, title: data.title, content: data.content },
    });
    return { success: true, data: note };
  }
}

// ─── Analytics ──────────────────────────────────────────────────

export async function getInterviewAnalytics(): Promise<ActionResponse<{
  total: number; completed: number; scheduled: number; missed: number; cancelled: number;
  avgScore: number; totalPractices: number; byType: Record<string, number>; byCategory: Record<string, number>;
  recentScores: { date: string; score: number }[];
}>> {
  try {
    const user = await createOrGetUser();
    const [interviews, practices] = await Promise.all([
      prisma.interview.findMany({ where: { userId: user.id } }),
      prisma.interviewPractice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);

    const byType: Record<string, number> = {};
    interviews.forEach((i: { interviewType: string }) => { byType[i.interviewType] = (byType[i.interviewType] ?? 0) + 1; });

    const byCategory: Record<string, number> = {};
    practices.forEach((p: { category: string }) => { byCategory[p.category] = (byCategory[p.category] ?? 0) + 1; });

    const scores = practices.filter((p: { score: number | null }) => p.score != null).map((p: { score: number | null }) => p.score!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    const recentScores = practices.filter((p: { score: number | null }) => p.score != null).slice(0, 20).reverse().map((p: { score: number | null; createdAt: Date }) => ({
      date: p.createdAt.toISOString().split("T")[0],
      score: p.score!,
    }));

    return {
      success: true,
      data: {
        total: interviews.length,
        completed: interviews.filter((i: { status: string }) => i.status === "COMPLETED").length,
        scheduled: interviews.filter((i: { status: string }) => i.status === "SCHEDULED").length,
        missed: interviews.filter((i: { status: string }) => i.status === "MISSED").length,
        cancelled: interviews.filter((i: { status: string }) => i.status === "CANCELLED").length,
        avgScore,
        totalPractices: practices.length,
        byType,
        byCategory,
        recentScores,
      },
    };
  } catch { return { success: false, error: "Failed to compute analytics" }; }
}

// ─── Prep Context ───────────────────────────────────────────────

export async function getJobApplicationPrepContext(applicationId: string): Promise<ActionResponse<{
  application: any;
  careerProfile: any;
  emails: any[];
}>> {
  try {
    const user = await createOrGetUser();
    
    const application = await prisma.jobApplication.findFirst({
      where: { id: applicationId, userId: user.id },
    });
    
    if (!application) return { success: false, error: "Application not found" };

    const careerProfile = await prisma.aIUserProfile.findFirst({
      where: { userId: user.id },
    });

    const emails = await prisma.emailMessage.findMany({
      where: {
        userId: user.id,
        interviewRelated: true,
        OR: [
          { sender: { contains: application.company, mode: "insensitive" } },
          { subject: { contains: application.company, mode: "insensitive" } },
          { snippet: { contains: application.company, mode: "insensitive" } },
        ]
      },
      orderBy: { receivedAt: "desc" },
      take: 5
    });

    return {
      success: true,
      data: {
        application,
        careerProfile,
        emails
      }
    };
  } catch { return { success: false, error: "Failed to load prep context" }; }
}
