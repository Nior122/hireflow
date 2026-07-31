import type { JobProvider } from "./types";
import type { JobResult, JobSearchParams } from "@/lib/types";
import { stripHtml } from "@/lib/utils";
import { z } from "zod";

const AdzunaResponseSchema = z.object({
  results: z.array(z.object({
    id: z.string(),
    title: z.string(),
    company: z.object({ display_name: z.string() }),
    location: z.object({ display_name: z.string() }).nullable().optional(),
    salary_min: z.number().nullable().optional(),
    salary_max: z.number().nullable().optional(),
    salary_currency: z.string().nullable().optional(),
    description: z.string(),
    redirect_url: z.string(),
    contract_type: z.string().nullable().optional(),
    created: z.string(),
  })),
});

export class AdzunaProvider implements JobProvider {
  id = "adzuna";
  name = "Adzuna";
  enabled = true;
  requiresKey = true;

  async search(params: JobSearchParams): Promise<JobResult[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_API_KEY;
    if (!appId || !appKey || appId === "placeholder") return [];

    const baseUrl = "https://api.adzuna.com/v1/api/jobs/us/search/1";
    const searchParams = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: "20",
      content_type: "application/json",
    });
    if (params.keyword) searchParams.set("what", params.keyword);
    if (params.location) searchParams.set("where", params.location);
    if (params.salary) searchParams.set("salary_min", String(params.salary));
    if (params.jobType) searchParams.set("contract_type", params.jobType);

    const url = `${baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) return [];

    const raw = await response.json();
    const parsed = AdzunaResponseSchema.safeParse(raw);
    if (!parsed.success) return [];

    return parsed.data.results.slice(0, 20).map(job => this.normalize(job));
  }

  private normalize(job: z.infer<typeof AdzunaResponseSchema.shape.results.element>): JobResult {
    return {
      externalId: `adzuna-${job.id}`,
      source: "Adzuna",
      title: job.title,
      company: job.company.display_name,
      location: job.location?.display_name ?? null,
      remoteType: null,
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      salaryCurrency: job.salary_currency ?? "USD",
      description: stripHtml(job.description.slice(0, 3000)),
      requirements: null,
      skills: [],
      companyLogo: null,
      companyWebsite: null,
      applicationUrl: job.redirect_url,
      postedAt: job.created,
    };
  }

}
