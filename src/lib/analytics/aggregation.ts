import { prisma } from "@/lib/prisma";
import { differenceInDays, subDays, subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export interface ExecutiveMetrics {
  openPositions: number;
  totalApplications: number;
  totalCandidates: number;
  totalInterviews: number;
  totalOffers: number;
  acceptedOffers: number;
  rejectedOffers: number;
  totalHires: number;
  offerAcceptanceRate: number;
  avgTimeToHire: number;
  avgTimeToFill: number;
  pipelineVelocity: number;
  monthlyTrend: { month: string; applications: number; hires: number; interviews: number }[];
}

export interface HiringFunnel {
  stage: string;
  count: number;
  conversion: number;
  dropOff: number;
  avgDays: number;
}

export interface RecruiterPerf {
  userId: string;
  email: string;
  candidatesReviewed: number;
  interviewsScheduled: number;
  offersGenerated: number;
  hires: number;
  avgResponseTime: number;
  avgRating: number;
}

export interface SourceAnalytics {
  source: string;
  applications: number;
  interviews: number;
  offers: number;
  hires: number;
  conversion: number;
}

export interface DepartmentAnalytics {
  department: string;
  openJobs: number;
  applications: number;
  interviewRate: number;
  hireRate: number;
  avgTimeToHire: number;
}

export interface AiInsight {
  id: string;
  type: "trend" | "recommendation" | "warning" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  data: unknown;
  action?: string;
}

// ─── Executive Metrics ─────────────────────────────────────────

export async function getExecutiveMetrics(orgId?: string): Promise<ExecutiveMetrics> {
  const where = orgId ? { organizationId: orgId } : {};

  const candidates: Array<{ status: string; appliedAt: Date; rating: number | null }> = await prisma.candidate.findMany({ where: orgId ? { employer: { orgMemberships: { some: { organizationId: orgId } } } } : {}, select: { status: true, appliedAt: true, rating: true } });
  const interviews: Array<{ status: string; createdAt: Date }> = await prisma.interview.findMany({ where: orgId ? { user: { orgMemberships: { some: { organizationId: orgId } } } } : {}, select: { status: true, createdAt: true } });
  const jobPostings: Array<{ status: string }> = await prisma.jobPosting.findMany({ where: orgId ? { organizationId: orgId } : {}, select: { status: true } });

  const totalCandidates = candidates.length;
  const byStatus = (s: string) => candidates.filter(c => c.status === s).length;

  const openPositions = jobPostings.filter(j => j.status === "PUBLISHED").length;
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter(i => i.status === "COMPLETED").length;

  const offers = byStatus("OFFER");
  const hired = byStatus("HIRED");
  const rejected = byStatus("REJECTED");

  const offered = candidates.filter(c => ["OFFER", "HIRED"].includes(c.status));
  const avgTimeToHire = offered.length > 0
    ? Math.round(offered.reduce((s, c) => s + differenceInDays(new Date(), new Date(c.appliedAt)), 0) / offered.length)
    : 0;

  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(new Date(), i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthCandidates = candidates.filter(c => c.appliedAt >= start && c.appliedAt <= end);
    monthlyTrend.push({
      month: format(date, "MMM"),
      applications: monthCandidates.length,
      hires: monthCandidates.filter(c => c.status === "HIRED").length,
      interviews: monthCandidates.filter(c => c.status === "INTERVIEW").length,
    });
  }

  return {
    openPositions,
    totalApplications: totalCandidates,
    totalCandidates,
    totalInterviews,
    totalOffers: offers,
    acceptedOffers: hired,
    rejectedOffers: rejected,
    totalHires: hired,
    offerAcceptanceRate: offers > 0 ? Math.round((hired / Math.max(offers + hired, 1)) * 100) : 0,
    avgTimeToHire,
    avgTimeToFill: avgTimeToHire,
    pipelineVelocity: totalCandidates > 0 ? Math.round((completedInterviews / totalCandidates) * 100) : 0,
    monthlyTrend,
  };
}

// ─── Hiring Funnel ─────────────────────────────────────────────

export async function getHiringFunnel(orgId?: string): Promise<HiringFunnel[]> {
  const candidates: Array<{ status: string; appliedAt: Date; updatedAt: Date }> = await prisma.candidate.findMany({
    where: orgId ? { employer: { orgMemberships: { some: { organizationId: orgId } } } } : {},
    select: { status: true, appliedAt: true, updatedAt: true },
  });

  const stages = ["NEW", "REVIEWED", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
  const counts = stages.map(s => candidates.filter(c => c.status === s).length);
  const total = candidates.length || 1;

  return stages.map((stage, i) => ({
    stage,
    count: counts[i],
    conversion: i > 0 && counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 100,
    dropOff: i > 0 ? counts[i - 1] - counts[i] : 0,
    avgDays: 0,
  }));
}

// ─── Source Analytics ──────────────────────────────────────────

export async function getSourceAnalytics(orgId?: string): Promise<SourceAnalytics[]> {
  const candidates: Array<{ status: string; sourceEmailId: string | null }> = await prisma.candidate.findMany({
    where: orgId ? { employer: { orgMemberships: { some: { organizationId: orgId } } } } : {},
    select: { status: true, sourceEmailId: true },
  });

  const bySource: Record<string, { total: number; interviews: number; offers: number; hires: number }> = {};

  candidates.forEach(c => {
    const src = c.sourceEmailId ? "Email" : "Direct";
    if (!bySource[src]) bySource[src] = { total: 0, interviews: 0, offers: 0, hires: 0 };
    bySource[src].total++;
    if (c.status === "INTERVIEW" || c.status === "OFFER" || c.status === "HIRED") bySource[src].interviews++;
    if (c.status === "OFFER" || c.status === "HIRED") bySource[src].offers++;
    if (c.status === "HIRED") bySource[src].hires++;
  });

  return Object.entries(bySource).map(([source, data]) => ({
    source,
    applications: data.total,
    interviews: data.interviews,
    offers: data.offers,
    hires: data.hires,
    conversion: data.total > 0 ? Math.round((data.hires / data.total) * 100) : 0,
  }));
}

// ─── Recruiter Performance ────────────────────────────────────

export async function getRecruiterPerformance(orgId?: string): Promise<RecruiterPerf[]> {
  const members: Array<{ user: { id: string; email: string | null } }> = await prisma.organizationMember.findMany({
    where: orgId ? { organizationId: orgId, role: { in: ["OWNER", "ADMIN", "RECRUITER"] } } : {},
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  const results: RecruiterPerf[] = [];

  for (const member of members) {
    const candidates: Array<{ status: string; rating: number | null }> = await prisma.candidate.findMany({
      where: { recruiterId: member.user.id },
      select: { status: true, rating: true },
    });

    results.push({
      userId: member.user.id,
      email: member.user.email ?? "Unknown",
      candidatesReviewed: candidates.length,
      interviewsScheduled: candidates.filter(c => ["INTERVIEW", "OFFER", "HIRED"].includes(c.status)).length,
      offersGenerated: candidates.filter(c => ["OFFER", "HIRED"].includes(c.status)).length,
      hires: candidates.filter(c => c.status === "HIRED").length,
      avgResponseTime: 2,
      avgRating: candidates.filter(c => c.rating).length > 0
        ? Math.round(candidates.filter(c => c.rating).reduce((s, c) => s + (c.rating ?? 0), 0) / candidates.filter(c => c.rating).length)
        : 0,
    });
  }

  return results.sort((a, b) => b.hires - a.hires);
}

// ─── AI Insights ──────────────────────────────────────────────

export async function generateAiInsights(orgId?: string): Promise<AiInsight[]> {
  const metrics = await getExecutiveMetrics(orgId);
  const sources = await getSourceAnalytics(orgId);
  const insights: AiInsight[] = [];

  // Pipeline bottleneck
  if (metrics.pipelineVelocity < 30) {
    insights.push({
      id: "pipeline-slow",
      type: "warning",
      title: "Pipeline velocity is low",
      description: `Only ${metrics.pipelineVelocity}% of candidates reach interview stage. Consider reviewing screening criteria or improving job descriptions.`,
      confidence: 85,
      data: { velocity: metrics.pipelineVelocity },
      action: "Review screening process",
    });
  }

  // Offer acceptance
  if (metrics.offerAcceptanceRate < 60 && metrics.totalOffers > 0) {
    insights.push({
      id: "low-acceptance",
      type: "warning",
      title: "Offer acceptance rate is concerning",
      description: `Only ${metrics.offerAcceptanceRate}% of offers are accepted. Consider improving compensation, company culture communication, or candidate experience.`,
      confidence: 90,
      data: { rate: metrics.offerAcceptanceRate },
      action: "Review offer competitiveness",
    });
  }

  // Source effectiveness
  if (sources.length > 1) {
    const best = sources.reduce((a, b) => a.conversion > b.conversion ? a : b);
    if (best.conversion > 0) {
      insights.push({
        id: "best-source",
        type: "recommendation",
        title: `${best.source} is your most effective source`,
        description: `${best.source} has a ${best.conversion}% conversion rate with ${best.applications} applications and ${best.hires} hires. Consider allocating more resources here.`,
        confidence: 80,
        data: best,
        action: "Increase spend on " + best.source,
      });
    }
  }

  // Hiring velocity
  if (metrics.totalHires === 0 && metrics.totalApplications > 10) {
    insights.push({
      id: "no-hires",
      type: "opportunity",
      title: "No hires made yet from ${metrics.totalApplications} applications",
      description: "Consider reviewing your hiring process. High application volume with no hires suggests potential issues in screening or interview stages.",
      confidence: 70,
      data: metrics,
      action: "Audit hiring process",
    });
  }

  // Time to hire
  if (metrics.avgTimeToHire > 30) {
    insights.push({
      id: "slow-hire",
      type: "trend",
      title: "Average time to hire is ${metrics.avgTimeToHire} days",
      description: "This is above the industry average of 23 days. Faster hiring improves candidate experience and reduces the risk of losing top talent.",
      confidence: 85,
      data: { avgDays: metrics.avgTimeToHire },
      action: "Streamline hiring process",
    });
  }

  return insights;
}

// ─── Candidate Score ──────────────────────────────────────────

export async function getCandidateScores(orgId?: string) {
  const candidates: Array<{ id: string; name: string; status: string; rating: number | null; keySkills: string[]; experienceSummary: string | null; appliedAt: Date }> = await prisma.candidate.findMany({
    where: orgId ? { employer: { orgMemberships: { some: { organizationId: orgId } } } } : {},
    select: { id: true, name: true, status: true, rating: true, keySkills: true, experienceSummary: true, appliedAt: true },
  });

  return candidates.map(c => {
    const baseScore = (c.rating ?? 0) * 20;
    const statusBonus = c.status === "HIRED" ? 20 : c.status === "OFFER" ? 15 : c.status === "INTERVIEW" ? 10 : 0;
    const skillBonus = Math.min(20, (c.keySkills?.length ?? 0) * 4);
    return {
      ...c,
      compositeScore: Math.min(100, baseScore + statusBonus + skillBonus),
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}
