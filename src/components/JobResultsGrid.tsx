'use client';

import { motion } from "framer-motion";
import { JobCard } from "./JobCard";
import type { JobResult } from "@/lib/types";

interface Props {
  jobs: JobResult[];
  savedIds: Set<string>;
  onJobClick: (job: JobResult) => void;
  onJobSaved: (job: JobResult) => void;
  onJobImported: (job: JobResult) => void;
}

export function JobResultsGrid({ jobs, savedIds, onJobClick, onJobSaved, onJobImported }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job, i) => (
        <motion.div
          key={job.externalId}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
        >
          <JobCard
            job={job}
            isSaved={savedIds.has(`${job.source}:${job.externalId}`)}
            onClick={() => onJobClick(job)}
            onSaved={onJobSaved}
            onImported={onJobImported}
          />
        </motion.div>
      ))}
    </div>
  );
}
