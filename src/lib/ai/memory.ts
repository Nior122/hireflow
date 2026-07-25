/**
 * AI Memory System for user context and personalization.
 * Stores user preferences, career goals, and interaction history.
 */

import { prisma } from "@/lib/prisma";

export interface UserMemory {
  userId: string;
  careerGoals: string[];
  skills: string[];
  preferences: Record<string, unknown>;
  interviewHistory: string[];
  applicationStrategy: string;
  lastUpdated: Date;
}

export interface CareerContext {
  totalApplications: number;
  activeApplications: number;
  interviewsScheduled: number;
  responseRate: number;
  avgResponseTime: number;
  topCompanies: string[];
  recentActivity: string[];
}

/**
 * Get user's career context from their data.
 */
export async function getUserCareerContext(userId: string): Promise<CareerContext> {
  const applications = await prisma.jobApplication.findMany({
    where: { userId },
    select: { status: true, company: true, createdAt: true, updatedAt: true },
  });

  const totalApplications = applications.length;
  const activeApplications = applications.filter(a =>
    ["APPLIED", "INTERVIEW", "WISHLIST"].includes(a.status)
  ).length;
  const interviewsScheduled = applications.filter(a => a.status === "INTERVIEW").length;
  const responded = applications.filter(a =>
    !["UNAPPLIED", "WISHLIST"].includes(a.status)
  ).length;
  const responseRate = totalApplications > 0
    ? Math.round((responded / totalApplications) * 100)
    : 0;

  // Find top companies by application count
  const companyCount: Record<string, number> = {};
  applications.forEach(a => {
    companyCount[a.company] = (companyCount[a.company] ?? 0) + 1;
  });
  const topCompanies = Object.entries(companyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([company]) => company);

  // Recent activity
  const recentApps = applications
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
    .map(a => `${a.status}: ${a.role} at ${a.company}`);

  return {
    totalApplications,
    activeApplications,
    interviewsScheduled,
    responseRate,
    avgResponseTime: 0,
    topCompanies,
    recentActivity: recentApps,
  };
}

/**
 * Build a personalized system prompt with user context.
 */
export async function buildContextualPrompt(
  userId: string,
  basePrompt: string,
): Promise<string> {
  const context = await getUserCareerContext(userId);

  const contextBlock = `
## User's Job Search Context
- Total applications: ${context.totalApplications}
- Active applications: ${context.activeApplications}
- Interviews scheduled: ${context.interviewsScheduled}
- Response rate: ${context.responseRate}%
- Top companies: ${context.topCompanies.join(", ") || "None yet"}
- Recent activity: ${context.recentActivity.join("; ") || "None"}
`;

  return basePrompt + contextBlock;
}

/**
 * Track an AI interaction for future context.
 */
export async function trackAiInteraction(
  userId: string,
  action: string,
  input: string,
  output: string,
) {
  // Store in activity log for future context
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action: `AI_${action}`,
        detail: `Input: ${input.slice(0, 100)} | Output: ${output.slice(0, 100)}`,
      },
    });
  } catch {
    // Non-critical, don't fail
  }
}
