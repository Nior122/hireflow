'use server';

import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { logActivity } from "@/actions/activities";
import { AiMatchResultSchema, type JobResult, type ActionResponse, type SavedJobData, type AiMatchResult } from "@/lib/types";
import { createApplicationSchema } from "@/lib/types";

// ─── Helper: Map JobResult to SavedJob data ──────────────────────

function createSavedJobData(userId: string, job: JobResult, importedToKanban: boolean = false) {
  return {
    userId,
    externalId: job.externalId,
    source: job.source,
    title: job.title,
    company: job.company,
    location: job.location ?? null,
    remoteType: job.remoteType ?? null,
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
    salaryCurrency: job.salaryCurrency ?? null,
    description: job.description ?? null,
    requirements: job.requirements ?? null,
    skills: job.skills != null ? job.skills as Prisma.InputJsonValue : Prisma.JsonNull,
    companyLogo: job.companyLogo ?? null,
    companyWebsite: job.companyWebsite ?? null,
    applicationUrl: job.applicationUrl ?? null,
    postedAt: job.postedAt ? new Date(job.postedAt) : null,
    importedToKanban,
  };
}

// ─── Save a Job from search results ───────────────────────────────

export async function saveJob(job: JobResult): Promise<ActionResponse<SavedJobData>> {
  try {
    const user = await createOrGetUser();

    const existing = await prisma.savedJob.findUnique({
      where: { userId_externalId_source: { userId: user.id, externalId: job.externalId, source: job.source } },
    });
    if (existing) return { success: false, error: "Job already saved" };

    const saved = await prisma.savedJob.create({
      data: createSavedJobData(user.id, job),
    });

    await logActivity(user.id, "JOB_SAVED", `Saved job: ${job.title} at ${job.company}`);
    revalidatePath("/dashboard/discover");
    return { success: true, data: saved as SavedJobData };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to save job" };
  }
}

// ─── Get all saved jobs for current user ─────────────────────────

export async function getSavedJobs(): Promise<ActionResponse<SavedJobData[]>> {
  try {
    const user = await createOrGetUser();
    const jobs = await prisma.savedJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: jobs as SavedJobData[] };
  } catch { return { success: false, error: "Failed to fetch saved jobs" }; }
}

// ─── Delete a saved job ──────────────────────────────────────────

export async function deleteSavedJob(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.savedJob.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, error: "Saved job not found" };
    await prisma.savedJob.delete({ where: { id } });
    revalidatePath("/dashboard/discover");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to delete saved job" }; }
}

// ─── Import a saved job to Kanban board ──────────────────────────

export async function importSavedJobToKanban(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const saved = await prisma.savedJob.findFirst({ where: { id, userId: user.id } });
    if (!saved) return { success: false, error: "Saved job not found" };
    if (saved.importedToKanban) return { success: false, error: "Already imported to Kanban" };

    // Create a FormData-like object for the server action
    const lastApp = await prisma.jobApplication.findFirst({
      where: { userId: user.id, status: "UNAPPLIED" },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.jobApplication.create({
      data: {
        userId: user.id,
        company: saved.company,
        role: saved.title,
        link: saved.applicationUrl ?? saved.companyWebsite ?? null,
        notes: saved.description ? saved.description.slice(0, 2000) : null,
        status: "UNAPPLIED",
        source: saved.source,
        position: (lastApp?.position ?? -1) + 1,
      },
    });

    await prisma.savedJob.update({ where: { id }, data: { importedToKanban: true } });
    await logActivity(user.id, "JOB_IMPORTED_TO_KANBAN", `Imported job: ${saved.title} at ${saved.company}`);

    revalidatePath("/dashboard/discover");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to import job" }; }
}

// ─── Import a search result job directly to Kanban (without saving first) ──

export async function importJobDirectlyToKanban(job: JobResult): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();

    // Check if already imported via saved job
    const existing = await prisma.savedJob.findUnique({
      where: { userId_externalId_source: { userId: user.id, externalId: job.externalId, source: job.source } },
    });
    if (existing?.importedToKanban) return { success: false, error: "Already imported to Kanban" };

    const lastApp = await prisma.jobApplication.findFirst({
      where: { userId: user.id, status: "UNAPPLIED" },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.jobApplication.create({
      data: {
        userId: user.id,
        company: job.company,
        role: job.title,
        link: job.applicationUrl ?? job.companyWebsite ?? null,
        notes: job.description ? job.description.slice(0, 2000) : null,
        status: "UNAPPLIED",
        source: job.source,
        position: (lastApp?.position ?? -1) + 1,
      },
    });

    // Auto-save the job record if not already saved
    if (!existing) {
      await prisma.savedJob.create({
        data: createSavedJobData(user.id, job, true),
      });
    }

    await logActivity(user.id, "JOB_IMPORTED_TO_KANBAN", `Imported job: ${job.title} at ${job.company}`);
    revalidatePath("/dashboard/discover");
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch { return { success: false, error: "Failed to import job" }; }
}

// ─── AI Match Analysis ───────────────────────────────────────────

export async function analyzeJobMatch(jobDescription: string, jobTitle: string, jobCompany: string): Promise<ActionResponse<AiMatchResult>> {
  try {
    const user = await createOrGetUser();

    // Get the user's resume from their first application that has notes, or a default
    const app = await prisma.jobApplication.findFirst({
      where: { userId: user.id, notes: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { notes: true },
    });

    const resumeText = app?.notes ?? "No resume found. Please add your resume text to your profile.";
    const { matchResume } = await import("@/lib/ai");
    const jobDesc = `Job Title: ${jobTitle}\nCompany: ${jobCompany}\n\nDescription:\n${jobDescription}`;

    const match = await matchResume(resumeText, jobDesc);

    // Map the result to AiMatchResult
    return {
      success: true,
      data: {
        matchPercentage: match.matchPercentage,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        prioritySkills: match.prioritySkills,
        recommendedCourses: match.recommendedCourses,
        recommendedCertifications: match.recommendedCertifications,
        resumeChanges: match.resumeChanges,
      },
    };
  } catch {
    return { success: false, error: "Failed to analyze match" };
  }
}
