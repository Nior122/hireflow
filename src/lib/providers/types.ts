import type { JobResult, JobSearchParams } from "@/lib/types";

export interface JobProvider {
  id: string;
  name: string;
  enabled: boolean;
  requiresKey: boolean;
  search(params: JobSearchParams): Promise<JobResult[]>;
}

export interface ProviderConfig {
  adzunaAppId?: string;
  adzunaAppKey?: string;
  jsearchApiKey?: string;
}
