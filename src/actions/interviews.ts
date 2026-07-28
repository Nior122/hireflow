'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";

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
    const update: { status?: string; notes?: string; scheduledAt?: Date; location?: string; meetingLink?: string; interviewerName?: string } = {};
    if (data.status) update.status = data.status;
    if (data.notes) update.notes = data.notes;
    if (data.scheduledAt) update.scheduledAt = new Date(data.scheduledAt);
    if (data.location !== undefined) update.location = data.location;
    if (data.meetingLink !== undefined) update.meetingLink = data.meetingLink;
    if (data.interviewerName !== undefined) update.interviewerName = data.interviewerName;
    const interview = await prisma.interview.update({ where: { id }, data: update });
    revalidatePath("/dashboard/interviews");
    return { success: true, data: interview };
  } catch { return { success: false, error: "Failed to update" }; }
}

export async function deleteInterview(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.interview.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/dashboard/interviews");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete" }; }
}

// ─── Practice Sessions ──────────────────────────────────────────

export async function savePractice(data: {
  interviewId?: string; company?: string; role?: string; category: string;
  difficulty: string; question: string; userAnswer: string; aiFeedback?: unknown; score?: number;
}): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const practice = await prisma.interviewPractice.create({
      data: {
        userId: user.id,
        interviewId: data.interviewId ?? null,
        company: data.company ?? null,
        role: data.role ?? null,
        category: data.category,
        difficulty: data.difficulty,
        question: data.question,
        userAnswer: data.userAnswer,
        aiFeedback: data.aiFeedback ?? null,
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
    const note = await prisma.interviewNote.upsert({
      where: { interviewId_type_title: { interviewId, type: data.type, title: data.title } },
      update: { content: data.content },
      create: { interviewId, type: data.type, title: data.title, content: data.content },
    });
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

    const scores = practices.filter(p => p.score != null).map(p => p.score!);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const recentScores = practices.filter(p => p.score != null).slice(0, 20).reverse().map(p => ({
      date: p.createdAt.toISOString().split("T")[0],
      score: p.score!,
    }));

    return {
      success: true,
      data: {
        total: interviews.length,
        completed: interviews.filter(i => i.status === "COMPLETED").length,
        scheduled: interviews.filter(i => i.status === "SCHEDULED").length,
        missed: interviews.filter(i => i.status === "MISSED").length,
        cancelled: interviews.filter(i => i.status === "CANCELLED").length,
        avgScore,
        totalPractices: practices.length,
        byType,
        byCategory,
        recentScores,
      },
    };
  } catch { return { success: false, error: "Failed to compute analytics" }; }
}
