'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActivityLog, ActionResponse } from "@/lib/types";

export async function getActivities(applicationId: string): Promise<ActionResponse<ActivityLog[]>> {
  try {
    const user = await createOrGetUser();
    const activities = await prisma.activityLog.findMany({ where: { userId: user.id, applicationId }, orderBy: { createdAt: "desc" } });
    return { success: true, data: activities as ActivityLog[] };
  } catch { return { success: false, error: "Failed to fetch activities" }; }
}

export async function logActivity(userId: string, action: string, detail?: string, applicationId?: string) {
  try {
    await prisma.activityLog.create({ data: { userId, action, detail, applicationId: applicationId ?? null } });
  } catch (e) { console.error("Failed to log activity:", e); }
}
