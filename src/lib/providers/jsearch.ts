import type { JobProvider } from "./types";
import type { JobResult, JobSearchParams } from "@/lib/types";
import { stripHtml } from "@/lib/utils";
import { z } from "zod";

const JSearchResponseSchema = z.object({
  data: z.array(z.object({
    job_id: z.string(),
    job_title: z.string(),
    employer_name: z.string(),
    job_city: z.string().nullable().optional(),
    job_state: z.string().nullable().optional(),
    job_country: z.string().nullable().optional(),
    job_is_remote: z.boolean().nullable().optional(),
    min_salary: z.number().nullable().optional(),
    max_salary: z.number().nullable().optional(),
    job_salary_currency: z.string().nullable().optional(),
    job_description: z.string(),
    job_required_skills: z.array(z.string()).nullable().optional(),
    job_highlights: z.object({ Qualifications: z.array(z.string()).nullable().optional() }).nullable().optional(),
    employer_logo: z.string().nullable().optional(),
    employer_website: z.string().nullable().optional(),
    job_apply_link: z.string(),
    job_posted_at_datetime_utc: z.string(),
    job_employment_type: z.string().nullable().optional(),
    job_required_experience: z.object({ required_experience_in_months: z.number().nullable().optional() }).nullable().optional(),
  })),
});

export class JSearchProvider implements JobProvider {
  id = "jsearch";
  name = "JSearch";
  enabled = true;
  requiresKey = true;

  async search(params: JobSearchParams): Promise<JobResult[]> {
    const apiKey = process.env.JSEARCH_API_KEY;
    if (!apiKey || apiKey === "placeholder") return [];

    const query = [params.keyword, params.location].filter(Boolean).join(" in ");
    if (!query && !params.keyword) return [];

    const baseUrl = "https://jsearch.p.rapidapi.com/search";
    const searchParams = new URLSearchParams({
      query: query || params.keyword || "software engineer",
      page: "1",
      num_pages: "1",
    });
    if (params.remote === "remote") searchParams.set("remote_jobs_only", "true");
    if (params.salary) searchParams.set("salary_min", String(params.salary));

    const url = `${baseUrl}?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const raw = await response.json();
    const parsed = JSearchResponseSchema.safeParse(raw);
    if (!parsed.success) return [];

    return parsed.data.slice(0, 20).map(job => this.normalize(job));
  }

  private normalize(job: z.infer<typeof JSearchResponseSchema.shape.data.element>): JobResult {
    const locParts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
    const skills = job.job_required_skills ?? [];
    const quals = job.job_highlights?.Qualifications ?? [];

    return {
      externalId: `jsearch-${job.job_id}`,
      source: "JSearch",
      title: job.job_title,
      company: job.employer_name,
      location: locParts.length > 0 ? locParts.join(", ") : null,
      remoteType: job.job_is_remote ? "remote" : null,
      salaryMin: job.min_salary ?? null,
      salaryMax: job.max_salary ?? null,
      salaryCurrency: job.job_salary_currency ?? "USD",
      description: stripHtml(job.job_description.slice(0, 3000)),
      requirements: quals.length > 0 ? quals.join("\n") : null,
      skills,
      companyLogo: job.employer_logo ?? null,
      companyWebsite: job.employer_website ?? null,
      applicationUrl: job.job_apply_link,
      postedAt: job.job_posted_at_datetime_utc,
    };
  }

}
