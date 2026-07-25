import { z } from "zod";

export type ApplicationStatus =
  | "UNAPPLIED"
  | "WISHLIST"
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  UNAPPLIED: "Unapplied",
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  UNAPPLIED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  WISHLIST: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  APPLIED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  INTERVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  OFFER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "UNAPPLIED",
  "WISHLIST",
  "APPLIED",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export const SOURCE_OPTIONS = [
  "LinkedIn",
  "Company Site",
  "Referral",
  "Indeed",
  "Glassdoor",
  "AngelList",
  "Twitter/X",
  "Email",
  "Other",
];

export type CandidateStatus =
  | "NEW"
  | "REVIEWED"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED";

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

export const CANDIDATE_STATUS_COLORS: Record<CandidateStatus, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  REVIEWED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  INTERVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  OFFER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  HIRED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export const CANDIDATE_STATUS_ORDER: CandidateStatus[] = [
  "NEW",
  "REVIEWED",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
];

export const createApplicationSchema = z.object({
  company: z.string().min(1, "Company is required").max(200),
  role: z.string().min(1, "Role is required").max(200),
  notes: z.string().max(2000).optional(),
  link: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  source: z.string().optional(),
  status: z.enum(["UNAPPLIED", "WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]).default("UNAPPLIED"),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export interface ApplicationCard {
  id: string;
  company: string;
  role: string;
  notes: string | null;
  status: ApplicationStatus;
  position: number;
  link: string | null;
  source: string | null;
  sourceEmailId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLinkedin: string | null;
  resumeFileName: string | null;
  coverLetterFileName: string | null;
  otherDocuments: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CandidateCard {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  positionApplied: string;
  status: CandidateStatus;
  rating: number | null;
  tags: string[];
  sourceEmailId: string | null;
  position: number;
  appliedAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  title: string;
  dueDate: Date;
  isCompleted: boolean;
  applicationId: string;
  userId: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  action: string;
  detail: string | null;
  applicationId: string | null;
  createdAt: Date;
}

export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Job Discovery Types ─────────────────────────────────────────

export type RemoteType = "any" | "remote" | "hybrid" | "onsite";
export type JobSort = "newest" | "salary" | "company" | "relevance";

export const JobResultSchema = z.object({
  externalId: z.string(),
  source: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable().optional(),
  remoteType: z.string().nullable().optional(),
  salaryMin: z.number().nullable().optional(),
  salaryMax: z.number().nullable().optional(),
  salaryCurrency: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
  skills: z.array(z.string()).nullable().optional(),
  companyLogo: z.string().nullable().optional(),
  companyWebsite: z.string().nullable().optional(),
  applicationUrl: z.string().nullable().optional(),
  postedAt: z.string().nullable().optional(),
});

export type JobResult = z.infer<typeof JobResultSchema>;

export interface JobSearchParams {
  keyword: string;
  location?: string;
  remote?: RemoteType;
  salary?: number;
  experience?: string;
  jobType?: string;
  datePosted?: string;
  sort?: JobSort;
  cursor?: string;
}

export interface SavedJobData {
  id: string;
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string | null;
  requirements: string | null;
  skills: unknown;
  companyLogo: string | null;
  companyWebsite: string | null;
  applicationUrl: string | null;
  postedAt: Date | null;
  importedToKanban: boolean;
  createdAt: Date;
}

export interface AiMatchResult {
  matchPercentage: number;
  missingSkills: string[];
  strengths: string[];
  improvements: string[];
  interviewTips: string[];
}

export const AiMatchResultSchema = z.object({
  matchPercentage: z.number().min(0).max(100),
  missingSkills: z.array(z.string()),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  interviewTips: z.array(z.string()),
});