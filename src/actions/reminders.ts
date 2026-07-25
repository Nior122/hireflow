'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { logActivity } from "@/actions/activities";
import type { ActionResponse } from "@/lib/types";

interface ReminderData { id: string; title: string; dueDate: Date; isCompleted: boolean; applicationId: string; userId: string; createdAt: Date; }

export async function getReminders(): Promise<ActionResponse<ReminderData[]>> {
  try {
    const user = await createOrGetUser();
    const reminders = await prisma.reminder.findMany({ where: { userId: user.id }, orderBy: { dueDate: "asc" } });
    return { success: true, data: reminders as ReminderData[] };
  } catch { return { success: false, error: "Failed to fetch reminders" }; }
}

export async function createReminder(data: { title: string; dueDate: string; applicationId: string }): Promise<ActionResponse<ReminderData>> {
  try {
    const user = await createOrGetUser();
    const reminder = await prisma.reminder.create({
      data: { title: data.title, dueDate: new Date(data.dueDate), applicationId: data.applicationId, userId: user.id },
    });
    const app = await prisma.jobApplication.findUnique({ where: { id: data.applicationId } });
    await logActivity(user.id, "REMINDER_CREATED", `Created reminder: ${data.title} for ${app?.company ?? "application"}`, data.applicationId);
    revalidatePath("/dashboard");
    return { success: true, data: reminder as ReminderData };
  } catch { return { success: false, error: "Failed to create reminder" }; }
}

export async function completeReminder(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const reminder = await prisma.reminder.findFirst({ where: { id, userId: user.id } });
    if (!reminder) return { success: false, error: "Not found" };
    await prisma.reminder.update({ where: { id }, data: { isCompleted: true } });
    await logActivity(user.id, "REMINDER_COMPLETED", `Completed reminder: ${reminder.title}`, reminder.applicationId);
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}

export async function deleteReminder(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const reminder = await prisma.reminder.findFirst({ where: { id, userId: user.id } });
    if (!reminder) return { success: false, error: "Not found" };
    await prisma.reminder.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed" }; }
}
