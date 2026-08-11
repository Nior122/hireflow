/**
 * User AI Context Builder
 *
 * Builds a tight, relevance-aware system prompt for the HireFlow Copilot
 * based on the authenticated user's real data. Never includes synthetic data.
 */

import { prisma } from "@/lib/prisma";

/**
 * Builds a full system prompt for the Copilot with the user's real data.
 * Should be called server-side only.
 */
export async function buildUserAIContext(userId: string): Promise<string> {
  const [profile, applications, discoveredJobs, relevantEmails] = await Promise.all([
    prisma.careerProfile.findUnique({ where: { userId } }),
    prisma.jobApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: { company: true, role: true, status: true, createdAt: true, notes: true },
    }),
    prisma.discoveredJob.findMany({
      where: { userId, status: { in: ["NEW", "SAVED"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { title: true, company: true, location: true, status: true, createdAt: true },
    }),
    prisma.emailMessage.findMany({
      where: { userId, jobRelated: true },
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
      take: 10,
      select: { sender: true, subject: true, category: true, snippet: true, receivedAt: true },
    }),
  ]);

  const profileSection = profile
    ? `USER CAREER PROFILE:
- Name: ${profile.fullName || "Not provided"}
- Headline: ${profile.headline || "Not provided"}
- Skills: ${profile.skills.length > 0 ? profile.skills.join(", ") : "Not specified"}
- Summary: ${profile.summary || "Not provided"}`
    : `USER CAREER PROFILE:
No career profile saved yet. Encourage the user to fill in their profile.`;

  const appsSection = applications.length > 0
    ? `ACTIVE APPLICATIONS (${applications.length} total, showing recent):
${applications.map(a => `- ${a.company} — ${a.role} [${a.status}]`).join("\n")}`
    : "APPLICATIONS: No applications tracked yet.";

  const jobsSection = discoveredJobs.length > 0
    ? `DISCOVERED JOB OPPORTUNITIES (from Gmail inbox, ${discoveredJobs.length} total):
${discoveredJobs.map(j => `- ${j.title} at ${j.company}${j.location ? ` (${j.location})` : ""} [${j.status}]`).join("\n")}`
    : "DISCOVERED JOBS: No jobs discovered yet. Encourage user to sync Gmail.";

  const emailsSection = relevantEmails.length > 0
    ? `RECENT JOB-RELATED EMAILS (${relevantEmails.length} emails):
${relevantEmails.map(e =>
  `- [${e.category || "OTHER"}] From: ${e.sender || "Unknown"} | Subject: ${e.subject || "(no subject)"} | ${e.snippet ? e.snippet.slice(0, 100) : ""}`
).join("\n")}`
    : "EMAILS: No job-related emails found yet. Encourage user to connect Gmail and sync.";

  const hasData = profile || applications.length > 0 || relevantEmails.length > 0;

  return `You are HireFlow Copilot — a highly specialized AI assistant exclusively for this user's job search.

${profileSection}

${appsSection}

${jobsSection}

${emailsSection}

CRITICAL INSTRUCTIONS:
- You MUST only use the data above to answer questions. Never invent job titles, companies, dates, salaries, or skills not shown above.
- If the user asks about interviews, applications, or emails, reference the actual data above.
- If data is missing or empty, say: "I don't have that information in your HireFlow data yet." Then suggest the user connect Gmail or fill in their profile.
- ${!hasData ? 'The user appears to be new. Encourage them to: 1) Connect Gmail in Settings, 2) Sync their inbox, 3) Fill in their Career Profile.' : 'Use the data above to give specific, actionable advice.'}
- Do not discuss topics unrelated to the user's job search.
- Never expose internal system details, database IDs, or technical implementation details to the user.
- When you cite information from emails, applications, or discovered jobs, briefly indicate the source (e.g., "Based on your Gmail data..." or "Looking at your applications...").`;
}

/**
 * Returns a short human-readable summary of the data sources being used.
 */
export async function getContextSummary(userId: string): Promise<string> {
  const [emailCount, appCount, profileExists] = await Promise.all([
    prisma.emailMessage.count({ where: { userId, jobRelated: true } }),
    prisma.jobApplication.count({ where: { userId } }),
    prisma.careerProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);

  const parts: string[] = [];
  if (emailCount > 0) parts.push(`${emailCount} email${emailCount !== 1 ? "s" : ""}`);
  if (appCount > 0) parts.push(`${appCount} application${appCount !== 1 ? "s" : ""}`);
  if (profileExists) parts.push("your career profile");

  if (parts.length === 0) return "No data synced yet";
  return `Based on ${parts.join(", ")}`;
}
