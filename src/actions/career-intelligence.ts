'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";

// ─── Recruiter Contacts ──────────────────────────────────────────────────────

export async function getRecruiterContacts(): Promise<ActionResponse<{
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  relationship: string | null;
  lastContactedAt: Date | null;
  communicationCount: number;
}[]>> {
  try {
    const user = await createOrGetUser();
    const contacts = await prisma.recruiterContact.findMany({
      where: { userId: user.id },
      orderBy: { lastContactedAt: "desc" },
    });
    return { success: true, data: contacts };
  } catch {
    return { success: false, error: "Failed to load recruiter contacts." };
  }
}

export async function deleteRecruiterContact(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const deleted = await prisma.recruiterContact.deleteMany({
      where: { id, userId: user.id },
    });
    if (deleted.count === 0) return { success: false, error: "Contact not found." };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete contact." };
  }
}

// ─── Career Reminders ─────────────────────────────────────────────────────────

export async function getCareerReminders(): Promise<ActionResponse<{
  id: string;
  type: string;
  date: Date;
  confidence: number;
  title: string | null;
  description: string | null;
  isCompleted: boolean;
  sourceEmailId: string | null;
}[]>> {
  try {
    const user = await createOrGetUser();
    const reminders = await prisma.careerReminder.findMany({
      where: { userId: user.id, isCompleted: false },
      orderBy: { date: "asc" },
    });
    return { success: true, data: reminders };
  } catch {
    return { success: false, error: "Failed to load career reminders." };
  }
}

export async function completeCareerReminder(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const updated = await prisma.careerReminder.updateMany({
      where: { id, userId: user.id },
      data: { isCompleted: true },
    });
    if (updated.count === 0) return { success: false, error: "Reminder not found." };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to complete reminder." };
  }
}

export async function deleteCareerReminder(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const deleted = await prisma.careerReminder.deleteMany({
      where: { id, userId: user.id },
    });
    if (deleted.count === 0) return { success: false, error: "Reminder not found." };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete reminder." };
  }
}
