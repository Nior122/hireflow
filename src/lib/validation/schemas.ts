import { z } from "zod";

// ─── Common Schemas ────────────────────────────────────────────

export const emailSchema = z.string().email("Invalid email address");
export const urlSchema = z.string().url("Invalid URL").or(z.literal(""));
export const phoneSchema = z.string().regex(/^\+?[\d\s\-()]{7,20}$/, "Invalid phone number").optional();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Application Schemas ───────────────────────────────────────

export const createApplicationSchema = z.object({
  company: z.string().min(1, "Company is required").max(200).trim(),
  role: z.string().min(1, "Role is required").max(200).trim(),
  notes: z.string().max(2000).optional(),
  link: urlSchema,
  source: z.string().max(100).optional(),
  status: z.enum(["UNAPPLIED", "WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]).default("UNAPPLIED"),
});

export const updateApplicationSchema = createApplicationSchema.partial();

// ─── Candidate Schemas ─────────────────────────────────────────

export const createCandidateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).trim(),
  email: emailSchema,
  phone: phoneSchema,
  positionApplied: z.string().min(1, "Position is required").max(200).trim(),
  resumeText: z.string().max(50000).optional(),
  coverLetter: z.string().max(20000).optional(),
  keySkills: z.array(z.string().max(100)).max(50).optional(),
  experienceSummary: z.string().max(10000).optional(),
});

// ─── Saved Job Schemas ─────────────────────────────────────────

export const jobSearchSchema = z.object({
  keyword: z.string().min(1, "Keyword is required").max(200).trim(),
  location: z.string().max(200).trim().optional(),
  remote: z.enum(["any", "remote", "hybrid", "onsite"]).default("any"),
  salary: z.number().int().min(0).optional(),
  jobType: z.string().max(50).optional(),
  sort: z.enum(["newest", "relevance", "salary", "company"]).default("newest"),
});

// ─── AI Schemas ────────────────────────────────────────────────

export const aiRequestSchema = z.object({
  action: z.enum([
    "improve_summary", "rewrite_bullets", "generate_achievements",
    "fix_grammar", "tailor_for_job", "generate_cover_letter", "ats_keywords",
  ]),
  resumeText: z.string().max(50000).optional(),
  jobDescription: z.string().max(50000).optional(),
  extra: z.string().max(5000).optional(),
});

// ─── Interview Schemas ─────────────────────────────────────────

export const createInterviewSchema = z.object({
  company: z.string().min(1, "Company is required").max(200).trim(),
  position: z.string().min(1, "Position is required").max(200).trim(),
  interviewType: z.enum(["PHONE_SCREEN", "TECHNICAL", "HR", "BEHAVIORAL", "SYSTEM_DESIGN", "PAIR_PROGRAMMING", "MANAGER_ROUND", "EXECUTIVE", "FINAL_ROUND", "ASSESSMENT"]).default("TECHNICAL"),
  interviewRound: z.number().int().min(1).default(1),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().min(15).max(480).default(60),
  location: z.string().max(500).trim().optional(),
  meetingLink: urlSchema.optional(),
  interviewerName: z.string().max(200).trim().optional(),
  interviewerEmail: emailSchema.optional(),
  timezone: z.string().max(50).optional(),
});

// ─── Organization Schemas ──────────────────────────────────────

export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).trim(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  website: urlSchema.optional(),
  industry: z.string().max(100).trim().optional(),
  companySize: z.string().max(50).trim().optional(),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(["ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "VIEWER"]).default("VIEWER"),
});

// ─── Resume Schemas ────────────────────────────────────────────

export const createResumeSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).trim(),
});

export const createCoverLetterSchema = z.object({
  company: z.string().min(1).max(200).trim(),
  position: z.string().min(1).max(200).trim(),
  content: z.string().min(1, "Content is required").max(20000).trim(),
  resumeId: z.string().optional(),
});

// ─── Conversation Schemas ──────────────────────────────────────

export const createConversationSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  roleContext: z.string().max(50).trim(),
});

export const messageSchema = z.object({
  content: z.string().min(1, "Message is required").max(10000).trim(),
  role: z.enum(["user", "assistant"]).default("user"),
});

// ─── Scorecard Schema ──────────────────────────────────────────

export const scorecardSchema = z.object({
  technicalScore: z.number().int().min(0).max(100).optional(),
  communicationScore: z.number().int().min(0).max(100).optional(),
  problemSolvingScore: z.number().int().min(0).max(100).optional(),
  leadershipScore: z.number().int().min(0).max(100).optional(),
  cultureFitScore: z.number().int().min(0).max(100).optional(),
  recommendation: z.enum(["STRONG_HIRE", "HIRE", "NEUTRAL", "NO_HIRE", "STRONG_NO_HIRE"]),
  notes: z.string().max(5000).trim().optional(),
});

// ─── Webhook Schema ────────────────────────────────────────────

export const createWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL"),
  events: z.array(z.string().max(100)).min(1).max(20),
  organizationId: z.string().optional(),
});

// ─── API Key Schema ────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  scopes: z.enum(["read", "write", "admin", "analytics"]).default("read"),
});
