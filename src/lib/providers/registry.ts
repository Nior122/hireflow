import { JobProvider } from "./types";
import { RemotiveProvider } from "./remotive";
import { RemoteOkProvider } from "./remoteok";
import { AdzunaProvider } from "./adzuna";
import { JSearchProvider } from "./jsearch";
import type { JobResult, JobSearchParams } from "@/lib/types";

const providers: JobProvider[] = [
  new RemotiveProvider(),
  new RemoteOkProvider(),
  new AdzunaProvider(),
  new JSearchProvider(),
];

export function getEnabledProviders(): JobProvider[] {
  return providers.filter(p => p.enabled);
}

export async function searchAllProviders(params: JobSearchParams): Promise<JobResult[]> {
  const enabled = getEnabledProviders();
  const results = await Promise.allSettled(
    enabled.map(provider => provider.search(params))
  );

  const jobs: JobResult[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    }
  }

  // Deduplicate by title + company
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
