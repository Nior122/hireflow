/**
 * AI Career Agent — Intelligent job search assistant.
 * Analyzes user's job search data and provides actionable insights.
 */

import { getProvider } from "./providers";
import { getUserCareerContext } from "./memory";
import { z } from "zod";

export const CareerInsightSchema = z.object({
  insight: z.string(),
  type: z.enum(["action", "analysis", "suggestion", "warning"]),
  priority: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
  confidence: z.number().min(0).max(100),
});

export type CareerInsight = z.infer<typeof CareerInsightSchema>;

/**
 * Generate personalized career insights for the user.
 */
export async function generateCareerInsights(
  userId: string,
): Promise<CareerInsight[]> {
  const context = await getUserCareerContext(userId);
  const provider = getProvider();

  const systemPrompt = `You are an expert career coach AI. Analyze the user's job search data and provide 3-5 actionable insights.

Return a JSON array of insights. Each insight must have:
- insight: Specific actionable advice (1-2 sentences)
- type: "action" | "analysis" | "suggestion" | "warning"
- priority: "high" | "medium" | "low"
- reasoning: Why this insight matters (1 sentence)
- confidence: 0-100 score

Focus on:
- Follow-up opportunities
- Resume improvement
- Application strategy
- Interview preparation
- Pattern recognition

Return ONLY the JSON array, no other text.`;

  const userMessage = `Job Search Data:
- Total applications: ${context.totalApplications}
- Active applications: ${context.activeApplications}
- Interviews scheduled: ${context.interviewsScheduled}
- Response rate: ${context.responseRate}%
- Top companies: ${context.topCompanies.join(", ") || "None yet"}
- Recent activity: ${context.recentActivity.slice(0, 3).join("; ") || "None"}`;

  try {
    const response = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.4, maxTokens: 1024 },
    );

    // Parse response
    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const insights = Array.isArray(parsed) ? parsed : [parsed];

    // Validate each insight
    return insights
      .map((i: unknown) => CareerInsightSchema.safeParse(i))
      .filter((r): r is { success: true; data: CareerInsight } => r.success)
      .map(r => r.data);
  } catch {
    // Return default insights on failure
    return getDefaultInsights(context);
  }
}

/**
 * Generate a personalized daily briefing.
 */
export async function generateDailyBriefing(userId: string): Promise<string> {
  const context = await getUserCareerContext(userId);
  const provider = getProvider();

  const systemPrompt = `You are a career assistant generating a daily briefing. Be concise and actionable.

Format your response as:
1. **Today's Priority** (1-2 items)
2. **This Week** (key dates/deadlines)
3. **Quick Wins** (easy actions to take)
4. **Reminder** (follow-ups needed)

Keep it under 200 words. Use bullet points.`;

  const userMessage = `Job Search Status:
- ${context.activeApplications} active applications
- ${context.interviewsScheduled} interviews scheduled
- Response rate: ${context.responseRate}%
- Top companies: ${context.topCompanies.slice(0, 3).join(", ")}`;

  try {
    return await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.3, maxTokens: 512 },
    );
  } catch {
    return generateDefaultBriefing(context);
  }
}

function getDefaultInsights(context: {
  totalApplications: number;
  responseRate: number;
  interviewsScheduled: number;
  activeApplications: number;
}): CareerInsight[] {
  const insights: CareerInsight[] = [];

  if (context.totalApplications === 0) {
    insights.push({
      insight: "Start by adding your first job application to begin tracking your job search.",
      type: "action",
      priority: "high",
      reasoning: "No applications tracked yet",
      confidence: 95,
    });
  }

  if (context.activeApplications > 0 && context.interviewsScheduled === 0) {
    insights.push({
      insight: "You have active applications but no interviews yet. Consider improving your resume or following up.",
      type: "suggestion",
      priority: "medium",
      reasoning: "No interviews from active applications",
      confidence: 80,
    });
  }

  if (context.responseRate < 20 && context.totalApplications > 5) {
    insights.push({
      insight: "Your response rate is below average. Tailoring your resume for each role could improve this.",
      type: "warning",
      priority: "high",
      reasoning: "Low response rate indicates potential resume or targeting issues",
      confidence: 85,
    });
  }

  return insights;
}

function generateDefaultBriefing(context: {
  activeApplications: number;
  interviewsScheduled: number;
  responseRate: number;
}): string {
  return `## Daily Briefing

**Today's Priority**
- Check for new responses to your ${context.activeApplications} active applications

**Quick Wins**
- Update any pending applications
- Review interview prep materials

**Reminder**
- You have ${context.interviewsScheduled} upcoming interviews this week`;
}
