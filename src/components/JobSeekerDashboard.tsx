'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Inbox } from "lucide-react";
import { KanbanBoard } from "./KanbanBoard";
import { EmptyState } from "./EmptyState";
import { SearchFilterBar } from "./SearchFilterBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getApplications } from "@/actions/applications";
import type { ApplicationCard, ApplicationStatus } from "@/lib/types";

const StatsSection = dynamic(() => import("./StatsSection").then(m => ({ default: m.StatsSection })), { loading: () => <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div> });
const EmailDigestPanel = dynamic(() => import("./EmailDigestPanel").then(m => ({ default: m.EmailDigestPanel })), { loading: () => <Skeleton className="h-32 rounded-xl" />, ssr: false });

interface Props { userId: string; }

export function JobSeekerDashboard({ userId }: Props) {
  const [applications, setApplications] = useState<ApplicationCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ search: string; statuses: ApplicationStatus[] }>({ search: "", statuses: [] });
  const [showDigest, setShowDigest] = useState(false);

  useEffect(() => {
    getApplications().then(r => {
      setApplications(r.success ? r.data : []);
      setLoading(false);
    });
  }, []);

  const filteredApps = useMemo(() => {
    const apps = applications ?? [];
    let result = apps;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(a =>
        a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q)) ||
        (a.contactName && a.contactName.toLowerCase().includes(q)) ||
        (a.contactEmail && a.contactEmail.toLowerCase().includes(q)) ||
        (a.resumeFileName && a.resumeFileName.toLowerCase().includes(q)) ||
        (a.coverLetterFileName && a.coverLetterFileName.toLowerCase().includes(q))
      );
    }

    if (filters.statuses.length > 0) {
      result = result.filter(a => filters.statuses.includes(a.status));
    }

    return result;
  }, [applications, filters]);

  const handleFilterChange = useCallback((newFilters: { search: string; statuses: ApplicationStatus[] }) => {
    setFilters(newFilters);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const apps = applications ?? [];

  if (apps.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowDigest(!showDigest)}>
            <Inbox className="h-4 w-4" /> Email Digest
          </Button>
        </div>
        {showDigest && (
          <div className="mb-4 p-4 rounded-xl border bg-card">
            <EmailDigestPanel />
          </div>
        )}
        <EmptyState />
      </div>
    );
  }

  const isFiltering = filters.search || filters.statuses.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowDigest(!showDigest)}>
          <Inbox className="h-4 w-4" /> Email Digest
        </Button>
      </div>
      {showDigest && (
        <div className="mb-6 p-4 rounded-xl border bg-card">
          <EmailDigestPanel />
        </div>
      )}
      <StatsSection applications={apps} />
      <SearchFilterBar applications={apps} onFilterChange={handleFilterChange} />
      {isFiltering && filteredApps.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No matching applications</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <KanbanBoard initialApplications={isFiltering ? filteredApps : apps} />
      )}
    </motion.div>
  );
}
