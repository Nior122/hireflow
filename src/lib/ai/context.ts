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
  const [profile, applications, discoveredJobs, relevantEmails, memories, recruiterContacts, careerReminders] = await Promise.all([
    prisma.aIUserProfile.findUnique({ where: { userId } }),
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
    prisma.aIUserMemory.findMany({
      where: { userId },
      orderBy: [{ confidence: "desc" }],
      take: 50,
      select: { category: true, key: true, value: true, confidence: true, source: true },
    }),
    prisma.recruiterContact.findMany({
      where: { userId },
      orderBy: { lastContactedAt: "desc" },
      take: 10,
      select: { name: true, company: true, role: true, relationship: true },
    }),
    prisma.careerReminder.findMany({
      where: { userId, isCompleted: false },
      orderBy: { date: "asc" },
      take: 5,
      select: { type: true, title: true, date: true },
    })
  ]);

  const profileSection = profile
    ? `USER CAREER PROFILE:
- Skills: ${profile.skills.length > 0 ? profile.skills.join(", ") : "Not specified"}
- Technical Skills: ${profile.technicalSkills.length > 0 ? profile.technicalSkills.join(", ") : "Not specified"}
- Summary: ${profile.summary || "Not provided"}
- Preferred Roles: ${profile.preferredRoles.length > 0 ? profile.preferredRoles.join(", ") : "Not specified"}
- Preferred Locations: ${profile.preferredLocations.length > 0 ? profile.preferredLocations.join(", ") : "Not specified"}

AI EXTRACTED MEMORY (Additional facts learned about the user):
${memories.length > 0 ? memories.map((m: { category: string; key: string; value: string; confidence: number }) => `- [${m.category}] ${m.key}: ${m.value} (Confidence: ${Math.round(m.confidence * 100)}%)`).join("\n") : "No extracted memory yet."}`
    : `USER CAREER PROFILE:
No career profile saved yet. Encourage the user to fill in their profile.`;

  const appsSection = applications.length > 0
    ? `ACTIVE APPLICATIONS (${applications.length} total, showing recent):
${applications.map((a: { company: string; role: string; status: string }) => `- ${a.company} — ${a.role} [${a.status}]`).join("\n")}`
    : "APPLICATIONS: No applications tracked yet.";

  const jobsSection = discoveredJobs.length > 0
    ? `DISCOVERED JOB OPPORTUNITIES (from Gmail inbox, ${discoveredJobs.length} total):
${discoveredJobs.map((j: { title: string; company: string; location: string | null; status: string }) => `- ${j.title} at ${j.company}${j.location ? ` (${j.location})` : ""} [${j.status}]`).join("\n")}`
    : "DISCOVERED JOBS: No jobs discovered yet. Encourage user to sync Gmail.";

  const emailsSection = relevantEmails.length > 0
    ? `RECENT JOB-RELATED EMAILS (${relevantEmails.length} emails):
${relevantEmails.map((e: { category: string | null; sender: string | null; subject: string | null; snippet: string | null }) =>
  `- [${e.category || "OTHER"}] From: ${e.sender || "Unknown"} | Subject: ${e.subject || "(no subject)"} | ${e.snippet ? e.snippet.slice(0, 100) : ""}`
).join("\n")}`
    : "EMAILS: No job-related emails found yet. Encourage user to connect Gmail and sync.";

  const contactsSection = recruiterContacts.length > 0
    ? `RECRUITER & EMPLOYER CONTACTS:
${recruiterContacts.map((c: { name: string; company: string | null; role: string | null; relationship: string | null }) => `- ${c.name} (${c.relationship || "Contact"}) at ${c.company || "Unknown Company"} - ${c.role || "Unknown Role"}`).join("\n")}`
    : "";

  const remindersSection = careerReminders.length > 0
    ? `UPCOMING DEADLINES & REMINDERS:
${careerReminders.map((r: { type: string; title: string | null; date: Date }) => `- [${r.type}] ${r.title || "Deadline"} on ${r.date.toISOString().split("T")[0]}`).join("\n")}`
    : "";

  const hasData = profile || applications.length > 0 || relevantEmails.length > 0;

  return `You are HireFlow Copilot — a highly specialized AI assistant exclusively for this user's job search.

${profileSection}

${appsSection}

${jobsSection}

${emailsSection}

${contactsSection}

${remindersSection}

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
    prisma.aIUserProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);

  const parts: string[] = [];
  if (emailCount > 0) parts.push(`${emailCount} email${emailCount !== 1 ? "s" : ""}`);
  if (appCount > 0) parts.push(`${appCount} application${appCount !== 1 ? "s" : ""}`);
  if (profileExists) parts.push("your career profile");

  if (parts.length === 0) return "No data synced yet";
  return `Based on ${parts.join(", ")}`;
}

/**
 * Builds a job-specific system prompt for AI features within a Job Workspace.
 * Includes the active job details, related emails, and career profile for
 * highly targeted responses.
 */
export async function buildJobAwareContext(userId: string, jobApplicationId: string): Promise<string> {
  const [profile, job, relatedEmails, resumes, memories] = await Promise.all([
    prisma.aIUserProfile.findUnique({ where: { userId } }),
    prisma.jobApplication.findUnique({ where: { id: jobApplicationId } }),
    prisma.emailMessage.findMany({
      where: { userId, jobRelated: true },
      orderBy: [{ receivedAt: "desc" }],
      take: 15,
    }),
    prisma.resume.findMany({
      where: { userId, jobApplicationId },
      include: { sections: { orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.aIUserMemory.findMany({
      where: { userId },
      orderBy: [{ confidence: "desc" }],
      take: 50,
      select: { category: true, key: true, value: true, confidence: true },
    }),
  ]);

  if (!job) return buildUserAIContext(userId);

  // Filter emails specifically about this company
  const companyEmails = relatedEmails.filter(e =>
    e.sender?.toLowerCase().includes(job.company.toLowerCase()) ||
    e.subject?.toLowerCase().includes(job.company.toLowerCase()) ||
    e.snippet?.toLowerCase().includes(job.company.toLowerCase())
  );

  const profileSection = profile
    ? `USER CAREER PROFILE:
- Skills: ${profile.skills.length > 0 ? profile.skills.join(", ") : "Not specified"}
- Technical Skills: ${profile.technicalSkills.length > 0 ? profile.technicalSkills.join(", ") : "Not specified"}
- Summary: ${profile.summary || "Not provided"}

AI EXTRACTED MEMORY (Additional facts learned about the user):
${memories.length > 0 ? memories.map((m: { category: string; key: string; value: string; confidence: number }) => `- [${m.category}] ${m.key}: ${m.value} (Confidence: ${Math.round(m.confidence * 100)}%)`).join("\n") : "No extracted memory yet."}`
    : `USER CAREER PROFILE: Not yet completed.`;

  const jobSection = `ACTIVE JOB (CURRENT FOCUS):
- Company: ${job.company}
- Role: ${job.role}
- Status: ${job.status}
- Notes/Description: ${job.notes || "No description provided"}
- Contact: ${job.contactName || "Unknown"} ${job.contactEmail ? `(${job.contactEmail})` : ""}
- Source: ${job.source || "Manual entry"}`;

  const emailSection = companyEmails.length > 0
    ? `EMAILS FROM ${job.company.toUpperCase()} (${companyEmails.length} emails):
${companyEmails.map((e: { category: string | null; sender: string | null; subject: string | null; snippet: string | null }) =>
  `- [${e.category || "OTHER"}] From: ${e.sender || "Unknown"} | Subject: ${e.subject || "(no subject)"} | ${e.snippet ? e.snippet.slice(0, 120) : ""}`
).join("\n")}`
    : `EMAILS: No emails found from ${job.company}.`;

  const resumeSection = resumes.length > 0
    ? `TAILORED RESUMES FOR THIS JOB (${resumes.length}):
${resumes.map((r: { name: string; atsScore: number; sections: { id: string }[] }) => `- "${r.name}" (ATS: ${r.atsScore}%, ${r.sections.length} sections)`).join("\n")}`
    : `RESUMES: No tailored resume created for this job yet.`;

  return `You are HireFlow Copilot — focused on helping the user with their application for ${job.role} at ${job.company}.

${profileSection}

${jobSection}

${emailSection}

${resumeSection}

CRITICAL INSTRUCTIONS:
- You are in JOB WORKSPACE MODE. Every response should be in the context of the user's application to ${job.company} for ${job.role}.
- ONLY reference data provided above. Never invent skills, companies, dates, or qualifications.
- When suggesting resume content, ONLY use skills and experience from the Career Profile. Flag if a skill is NOT in the profile.
- When discussing interview preparation, focus on the specific role and company.
- Cite your data source briefly (e.g., "Based on your Career Profile..." or "From your Gmail correspondence with ${job.company}...").
- If information is missing, clearly say so and suggest the user update their profile or connect Gmail.
- Never expose database IDs or technical details.`;
}

