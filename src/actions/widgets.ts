'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";

export interface DashboardWidgets {
  showStats: boolean;
  showEmailDigest: boolean;
  showUpcomingInterviews: boolean;
  showSkillGaps: boolean;
}

const DEFAULT_WIDGETS: DashboardWidgets = {
  showStats: true,
  showEmailDigest: false,
  showUpcomingInterviews: true,
  showSkillGaps: false,
};

export async function getDashboardWidgets(): Promise<ActionResponse<DashboardWidgets>> {
  try {
    const user = await createOrGetUser();
    
    // Fallback to default if not set
    if (!user.dashboardWidgets) {
      return { success: true, data: DEFAULT_WIDGETS };
    }
    
    const widgets = typeof user.dashboardWidgets === "string" 
      ? JSON.parse(user.dashboardWidgets) 
      : user.dashboardWidgets;
      
    return { success: true, data: { ...DEFAULT_WIDGETS, ...widgets } as DashboardWidgets };
  } catch (error) {
    return { success: false, error: "Failed to load dashboard widgets" };
  }
}

export async function updateDashboardWidgets(widgets: Partial<DashboardWidgets>): Promise<ActionResponse<DashboardWidgets>> {
  try {
    const user = await createOrGetUser();
    const current = await getDashboardWidgets();
    const updated = { ...(current.success ? current.data : DEFAULT_WIDGETS), ...widgets };
    
    await prisma.user.update({
      where: { id: user.id },
      data: { dashboardWidgets: JSON.stringify(updated) },
    });
    
    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: "Failed to update dashboard widgets" };
  }
}
