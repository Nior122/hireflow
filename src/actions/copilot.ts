'use server';

import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";
import { suggestApplicationStatus as aiSuggestStatus, type SuggestedStatus } from "@/lib/ai";

interface ConversationData {
  id: string;
  title: string;
  roleContext: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageData {
  id: string;
  role: string;
  content: string;
  metadata: unknown;
  createdAt: Date;
}

// ─── Conversations ──────────────────────────────────────────────

export async function getConversations(): Promise<ActionResponse<ConversationData[]>> {
  try {
    const user = await createOrGetUser();
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      take: 50,
    });
    return { success: true, data: conversations as ConversationData[] };
  } catch { return { success: false, error: "Failed to load conversations" }; }
}

export async function createConversation(title: string, roleContext: string): Promise<ActionResponse<ConversationData>> {
  try {
    const user = await createOrGetUser();
    const conversation = await prisma.conversation.create({
      data: { userId: user.id, title, roleContext },
    });
    revalidatePath("/dashboard");
    return { success: true, data: conversation as ConversationData };
  } catch { return { success: false, error: "Failed to create conversation" }; }
}

export async function renameConversation(id: string, title: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.conversation.updateMany({ where: { id, userId: user.id }, data: { title } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to rename" }; }
}

export async function togglePin(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const conv = await prisma.conversation.findFirst({ where: { id, userId: user.id } });
    if (!conv) return { success: false, error: "Not found" };
    await prisma.conversation.update({ where: { id }, data: { pinned: !conv.pinned } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to update" }; }
}

export async function deleteConversation(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.conversation.deleteMany({ where: { id, userId: user.id } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete" }; }
}

// ─── Messages ───────────────────────────────────────────────────

export async function getMessages(conversationId: string): Promise<ActionResponse<MessageData[]>> {
  try {
    const user = await createOrGetUser();
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } });
    if (!conv) return { success: false, error: "Conversation not found" };

    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
    return { success: true, data: messages as MessageData[] };
  } catch { return { success: false, error: "Failed to load messages" }; }
}

export async function addMessage(conversationId: string, role: string, content: string, metadata?: unknown): Promise<ActionResponse<MessageData>> {
  try {
    const user = await createOrGetUser();
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } });
    if (!conv) return { success: false, error: "Conversation not found" };

    const message = await prisma.conversationMessage.create({
      data: { conversationId, role, content, metadata: metadata !== undefined ? metadata as Prisma.InputJsonValue : Prisma.JsonNull },
    });

    // Update conversation timestamp
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    return { success: true, data: message as MessageData };
  } catch { return { success: false, error: "Failed to save message" }; }
}

export async function getCareerScore(): Promise<ActionResponse<{ score: number; factors: { label: string; value: number; weight: number }[] }>> {
  try {
    const user = await createOrGetUser();

    const [totalApps, reminders, recentApps, activities] = await Promise.all([
      prisma.jobApplication.findMany({ where: { userId: user.id }, select: { status: true, createdAt: true } }),
      prisma.reminder.findMany({ where: { userId: user.id } }),
      prisma.jobApplication.findMany({ where: { userId: user.id, updatedAt: { gte: new Date(Date.now() - 14 * 86400000) } } }),
      prisma.activityLog.findMany({ where: { userId: user.id } }),
    ]);

    const total = totalApps.length || 1;
    const interviews = totalApps.filter((a: { status: string }) => ["INTERVIEW", "OFFER"].includes(a.status)).length;
    const responded = totalApps.filter((a: { status: string }) => !["UNAPPLIED", "WISHLIST"].includes(a.status)).length;
    const completedReminders = reminders.filter((r: { isCompleted: boolean }) => r.isCompleted).length;
    const totalReminders = reminders.length || 1;

    const factors = [
      { label: "Application Volume", value: Math.min(100, total * 3), weight: 20 },
      { label: "Response Rate", value: Math.round((responded / total) * 100), weight: 25 },
      { label: "Interview Rate", value: Math.min(100, Math.round((interviews / total) * 100) * 2), weight: 25 },
      { label: "Follow-up Consistency", value: Math.round((completedReminders / totalReminders) * 100), weight: 15 },
      { label: "Activity Level", value: Math.min(100, recentApps.length * 20 + activities.length * 5), weight: 15 },
    ];

    const score = Math.round(factors.reduce((s: number, f: { value: number; weight: number }) => s + (f.value * f.weight / 100), 0));

    return { success: true, data: { score, factors } };
  } catch { return { success: false, error: "Failed to compute career score" }; }
}

export async function suggestApplicationStatus(jobTitle: string, company: string, notes: string): Promise<ActionResponse<SuggestedStatus>> {
  try {
    await createOrGetUser(); // Ensure authenticated
    const result = await aiSuggestStatus(jobTitle, company, notes);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to generate AI suggestion" };
  }
}
