'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import {
  getExecutiveMetrics, getHiringFunnel, getSourceAnalytics,
  getRecruiterPerformance, generateAiInsights, getCandidateScores,
} from "@/lib/analytics/aggregation";
import type { ActionResponse } from "@/lib/types";

// ─── Executive Dashboard ───────────────────────────────────────

export async function getExecutiveDashboard(orgId?: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const targetOrg = orgId ?? await getUserOrgId(user.id);
    const [metrics, funnel, sources, recruiterPerf, insights] = await Promise.all([
      getExecutiveMetrics(targetOrg),
      getHiringFunnel(targetOrg),
      getSourceAnalytics(targetOrg),
      getRecruiterPerformance(targetOrg),
      generateAiInsights(targetOrg),
    ]);
    return { success: true, data: { metrics, funnel, sources, recruiterPerf, insights } };
  } catch { return { success: false, error: "Failed to load analytics" }; }
}

// ─── Recruiter Dashboard ──────────────────────────────────────

export async function getRecruiterDashboard(orgId?: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const targetOrg = orgId ?? await getUserOrgId(user.id);
    const [recruiters, funnel, sources] = await Promise.all([
      getRecruiterPerformance(targetOrg),
      getHiringFunnel(targetOrg),
      getSourceAnalytics(targetOrg),
    ]);
    return { success: true, data: { recruiters, funnel, sources } };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Candidate Intelligence ───────────────────────────────────

export async function getCandidateIntelligence(orgId?: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const targetOrg = orgId ?? await getUserOrgId(user.id);
    const scores = await getCandidateScores(targetOrg);

    // Skills distribution
    const skillCount: Record<string, number> = {};
    scores.forEach((c: Record<string, unknown>) => {
      const skills = c.keySkills as string[];
      if (skills) skills.forEach((s: string) => { skillCount[s] = (skillCount[s] ?? 0) + 1; });
    });
    const topSkills = Object.entries(skillCount).sort((a, b) => b[1] - a[1]).slice(0, 15);

    // Status distribution
    const statusDist: Record<string, number> = {};
    scores.forEach((c: Record<string, unknown>) => {
      const status = c.status as string;
      statusDist[status] = (statusDist[status] ?? 0) + 1;
    });

    return { success: true, data: { scores, topSkills, statusDist, total: scores.length } };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── Source Analytics ─────────────────────────────────────────

export async function getSourceDashboard(orgId?: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const targetOrg = orgId ?? await getUserOrgId(user.id);
    const sources = await getSourceAnalytics(targetOrg);
    return { success: true, data: sources };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── AI Insights ──────────────────────────────────────────────

export async function getAiInsightsDashboard(orgId?: string): Promise<ActionResponse<any>> {
  try {
    const user = await createOrGetUser();
    const targetOrg = orgId ?? await getUserOrgId(user.id);
    const insights = await generateAiInsights(targetOrg);
    return { success: true, data: insights };
  } catch { return { success: false, error: "Failed" }; }
}

// ─── AI Report Generator ──────────────────────────────────────

export async function generateReport(orgId?: string): Promise<ActionResponse<string>> {
  try {
    const user = await createOrGetUser();
    const targetOrg = orgId ?? await getUserOrgId(user.id);
    const [metrics, funnel, sources, insights] = await Promise.all([
      getExecutiveMetrics(targetOrg),
      getHiringFunnel(targetOrg),
      getSourceAnalytics(targetOrg),
      generateAiInsights(targetOrg),
    ]);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "placeholder") {
      return { success: true, data: generateTextReport(metrics, funnel, sources, insights) };
    }

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            { role: "system", content: "You are an expert HR analyst. Generate a professional quarterly hiring report in markdown. Include executive summary, key metrics, trends, insights, and recommendations." },
            { role: "user", content: `Generate a hiring report based on this data:\n\nMetrics: ${JSON.stringify(metrics)}\nFunnel: ${JSON.stringify(funnel)}\nSources: ${JSON.stringify(sources)}\nInsights: ${JSON.stringify(insights.map((i: { title: string; description: string }) => ({ title: i.title, description: i.description })))}` },
          ],
          temperature: 0.4,
          max_tokens: 2000,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, data: data.choices?.[0]?.message?.content ?? generateTextReport(metrics, funnel, sources, insights) };
      }
    } catch {}

    return { success: true, data: generateTextReport(metrics, funnel, sources, insights) };
  } catch { return { success: false, error: "Failed" }; }
}

function generateTextReport(metrics: { totalApplications: number; totalHires: number; offerAcceptanceRate: number; avgTimeToHire: number; pipelineVelocity: number }, funnel: { stage: string; count: number; conversion: number }[], sources: { source: string; applications: number; hires: number; conversion: number }[], insights: { title: string; description: string; confidence: number }[]): string {
  return `# Quarterly Hiring Report

## Executive Summary
- **Total Applications**: ${metrics.totalApplications}
- **Total Hires**: ${metrics.totalHires}
- **Offer Acceptance Rate**: ${metrics.offerAcceptanceRate}%
- **Average Time to Hire**: ${metrics.avgTimeToHire} days
- **Pipeline Velocity**: ${metrics.pipelineVelocity}%

## Hiring Funnel
${funnel.map((f: { stage: string; count: number; conversion: number }) => `- **${f.stage}**: ${f.count} candidates (${f.conversion}% conversion)`).join("\n")}

## Source Effectiveness
${sources.map((s: { source: string; applications: number; hires: number; conversion: number }) => `- **${s.source}**: ${s.applications} applications, ${s.hires} hires (${s.conversion}% conversion)`).join("\n")}

## AI Insights
${insights.map((i: { title: string; description: string; confidence: number }) => `### ${i.title}\n${i.description}\n**Confidence**: ${i.confidence}%`).join("\n\n")}

## Recommendations
1. Focus on highest-converting sources
2. Address pipeline bottlenecks
3. Improve offer competitiveness
4. Streamline interview process

---
*Generated by HireFlow Analytics*`;
}

// ─── Helpers ──────────────────────────────────────────────────

async function getUserOrgId(userId: string): Promise<string | undefined> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { organizationId: true },
  });
  return membership?.organizationId;
}

// ─── Export ───────────────────────────────────────────────────

export async function exportAnalytics(format: "csv" | "json", orgId?: string): Promise<ActionResponse<string>> {
  try {
    const user = await createOrGetUser();
    const targetOrg = orgId ?? await getUserOrgId(user.id);
    const metrics = await getExecutiveMetrics(targetOrg);

    if (format === "json") {
      return { success: true, data: JSON.stringify(metrics, null, 2) };
    }

    const headers = ["Metric", "Value"];
    const rows = [
      ["Open Positions", metrics.openPositions],
      ["Total Applications", metrics.totalApplications],
      ["Total Interviews", metrics.totalInterviews],
      ["Total Offers", metrics.totalOffers],
      ["Accepted Offers", metrics.acceptedOffers],
      ["Rejected Offers", metrics.rejectedOffers],
      ["Total Hires", metrics.totalHires],
      ["Offer Acceptance Rate", `${metrics.offerAcceptanceRate}%`],
      ["Avg Time to Hire (days)", metrics.avgTimeToHire],
      ["Pipeline Velocity", `${metrics.pipelineVelocity}%`],
    ];

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    return { success: true, data: csv };
  } catch { return { success: false, error: "Failed" }; }
}
