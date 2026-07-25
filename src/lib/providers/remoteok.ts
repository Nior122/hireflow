import type { JobProvider } from "./types";
import type { JobResult, JobSearchParams } from "@/lib/types";
import { stripHtml } from "@/lib/utils";
import { z } from "zod";

const RemoteOkResponseSchema = z.array(z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  location: z.string().nullable().optional(),
  description: z.string(),
  url: z.string(),
  date: z.string(),
  logo: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
}));

export class RemoteOkProvider implements JobProvider {
  id = "remoteok";
  name = "RemoteOK";
  enabled = true;
  requiresKey = false;

  async search(params: JobSearchParams): Promise<JobResult[]> {
    const baseUrl = "https://remoteok.com/api";
    const searchParams = new URLSearchParams();
    if (params.keyword) searchParams.set("search", params.keyword);

    const url = `${baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "HireFlow/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const raw = await response.json();
    const parsed = RemoteOkResponseSchema.safeParse(raw);
    if (!parsed.success) return [];

    // First item might be a meta object; skip non-object items
    return parsed.data
      .filter(job => typeof job === "object" && job.id && job.company)
      .slice(0, 20)
      .map(job => this.normalize(job));
  }

  private normalize(job: z.infer<typeof RemoteOkResponseSchema.element>): JobResult {
    return {
      externalId: `remoteok-${job.id}`,
      source: "RemoteOK",
      title: job.position,
      company: job.company,
      location: job.location ?? null,
      remoteType: "remote",
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      salaryCurrency: job.currency ?? "USD",
      description: job.description ? stripHtml(job.description.slice(0, 3000)) : null,
      requirements: null,
      skills: job.tags?.slice(0, 10) ?? [],
      companyLogo: job.logo ? `https://remoteok.com${job.logo}` : null,
      companyWebsite: null,
      applicationUrl: `https://remoteok.com${job.url}`,
      postedAt: job.date,
    };
  }

}
