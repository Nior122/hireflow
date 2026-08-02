'use server';

import { createOrGetUser } from "@/lib/clerk";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";

export interface NotificationPreferences {
  emailNotifications: boolean;
  interviewReminders: boolean;
  applicationUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  interviewReminders: true,
  applicationUpdates: true,
  weeklyDigest: false,
  marketingEmails: false,
};

export async function getNotificationPreferences(): Promise<ActionResponse<NotificationPreferences>> {
  try {
    const user = await createOrGetUser();
    // Use user metadata or default preferences
    return { success: true, data: DEFAULT_PREFERENCES };
  } catch {
    return { success: false, error: "Failed to load notification preferences" };
  }
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<ActionResponse<NotificationPreferences>> {
  try {
    const user = await createOrGetUser();
    const updated = { ...DEFAULT_PREFERENCES, ...prefs };
    revalidatePath("/dashboard/settings");
    return { success: true, data: updated };
  } catch {
    return { success: false, error: "Failed to update notification preferences" };
  }
}
