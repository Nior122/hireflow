import type { JobProvider } from "./types";
import type { JobResult, JobSearchParams } from "@/lib/types";
import { stripHtml } from "@/lib/utils";
import { z } from "zod";

const RemotiveResponseSchema = z.object({
  jobs: z.array(z.object({
    id: z.string(),
    title: z.string(),
    company_name: z.string(),
    candidate_required_location: z.string().nullable().optional(),
    salary: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    url: z.string(),
    job_type: z.string().nullable().optional(),
    publication_date: z.string(),
    company_logo_url: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
  })),
});

export class RemotiveProvider implements JobProvider {
  id = "remotive";
  name = "Remotive";
  enabled = true;
  requiresKey = false;

  async search(params: JobSearchParams): Promise<JobResult[]> {
    const baseUrl = "https://remotive.com/api/remote-jobs";
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set("search", params.keyword);
    if (params.cursor) searchParams.set("cursor", params.cursor);

    const url = `${baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) return [];

    const raw = await response.json();
    const parsed = RemotiveResponseSchema.safeParse(raw);
    if (!parsed.success) return [];

    return parsed.data.jobs.slice(0, 20).map(job => this.normalize(job));
  }

  private normalize(job: z.infer<typeof RemotiveResponseSchema.shape.jobs.element>): JobResult {
    let salaryMin: number | null = null;
    let salaryMax: number | null = null;
    if (job.salary) {
      const nums = job.salary.replace(/[^0-9\-]/g, "").split("-").map(Number).filter(n => !isNaN(n));
      if (nums.length >= 2) { salaryMin = nums[0]; salaryMax = nums[1]; }
      else if (nums.length === 1) { salaryMin = nums[0]; salaryMax = nums[0]; }
    }

    return {
      externalId: `remotive-${job.id}`,
      source: "Remotive",
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location ?? null,
      remoteType: "remote",
      salaryMin,
      salaryMax,
      salaryCurrency: job.salary ? "USD" : null,
      description: job.description ? stripHtml(job.description.slice(0, 3000)) : null,
      requirements: null,
      skills: job.tags?.slice(0, 10) ?? [],
      companyLogo: job.company_logo_url ?? null,
      companyWebsite: null,
      applicationUrl: job.url,
      postedAt: job.publication_date,
    };
  }

}
