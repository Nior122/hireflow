'use client';

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookmarkCheck, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JobSearchHeader } from "./JobSearchHeader";
import { JobResultsGrid } from "./JobResultsGrid";
import { JobDetailDrawer } from "./JobDetailDrawer";
import { SavedJobsView } from "./SavedJobsView";
import { getSavedJobs } from "@/actions/discover";
import type { JobResult, JobSearchParams, SavedJobData } from "@/lib/types";

type Tab = "search" | "saved";

export function DiscoverJobs() {
  const [tab, setTab] = useState<Tab>("search");
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedJobs, setSavedJobs] = useState<SavedJobData[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadSaved = useCallback(async () => {
    const result = await getSavedJobs();
    if (result.success && result.data) {
      setSavedJobs(result.data);
      setSavedIds(new Set(result.data.map(s => `${s.source}:${s.externalId}`)));
    }
  }, []);

  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    if (newTab === "saved") loadSaved();
  }

  async function handleSearch(params: JobSearchParams) {
    setLoading(true);
    setSearched(true);
    try {
      const searchParams = new URLSearchParams();
      if (params.keyword) searchParams.set("keyword", params.keyword);
      if (params.location) searchParams.set("location", params.location);
      if (params.remote && params.remote !== "any") searchParams.set("remote", params.remote);
      if (params.salary) searchParams.set("salary", String(params.salary));
      if (params.jobType) searchParams.set("jobType", params.jobType);
      if (params.sort) searchParams.set("sort", params.sort);

      const res = await fetch(`/api/discover/search?${searchParams.toString()}`);
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } catch { setJobs([]); }
    setLoading(false);
  }

  function handleJobClick(job: JobResult) {
    setSelectedJob(job);
    setDrawerOpen(true);
  }

  function handleJobSaved(job: JobResult) {
    setSavedIds(prev => new Set([...prev, `${job.source}:${job.externalId}`]));
  }

  function handleJobImported(job: JobResult) {
    setSavedIds(prev => new Set([...prev, `${job.source}:${job.externalId}`]));
  }

  function handleSavedJobRemoved(id: string) {
    setSavedJobs(prev => prev.filter(j => j.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Job Discovery
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Find jobs from multiple providers and save them to your Kanban board</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          <Button
            variant={tab === "search" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("search")}
            className="gap-1.5"
          >
            <Search className="h-3.5 w-3.5" /> Search
          </Button>
          <Button
            variant={tab === "saved" ? "default" : "ghost"}
            size="sm"
            onClick={() => handleTabChange("saved")}
            className="gap-1.5"
          >
            <BookmarkCheck className="h-3.5 w-3.5" /> Saved
            {savedJobs.length > 0 && (
              <span className="ml-1 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{savedJobs.length}</span>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "search" ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <JobSearchHeader onSearch={handleSearch} loading={loading} />

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : searched && jobs.length === 0 ? (
              <div className="text-center py-20">
                <SearchX className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search keywords, broadening the location, or changing filters
                </p>
              </div>
            ) : !searched ? (
              <div className="text-center py-20">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl font-semibold mb-2">Find your next opportunity</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Search across Remotive, RemoteOK, and more to discover jobs from across the web. Save them and import directly to your Kanban board.
                </p>
              </div>
            ) : (
              <JobResultsGrid
                jobs={jobs}
                savedIds={savedIds}
                onJobClick={handleJobClick}
                onJobSaved={handleJobSaved}
                onJobImported={handleJobImported}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SavedJobsView
              jobs={savedJobs}
              loading={loading}
              onLoadSaved={loadSaved}
              onRemoveJob={handleSavedJobRemoved}
              onJobClick={(job) => {
                setSelectedJob({
                  externalId: job.externalId,
                  source: job.source,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  remoteType: job.remoteType,
                  salaryMin: job.salaryMin,
                  salaryMax: job.salaryMax,
                  salaryCurrency: job.salaryCurrency,
                  description: job.description,
                  requirements: job.requirements,
                  skills: job.skills as string[] | null,
                  companyLogo: job.companyLogo,
                  companyWebsite: job.companyWebsite,
                  applicationUrl: job.applicationUrl,
                  postedAt: job.postedAt?.toISOString(),
                });
                setDrawerOpen(true);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <JobDetailDrawer
        job={selectedJob}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isSaved={selectedJob ? savedIds.has(`${selectedJob.source}:${selectedJob.externalId}`) : false}
        onJobSaved={handleJobSaved}
        onJobImported={handleJobImported}
      />
    </div>
  );
}
