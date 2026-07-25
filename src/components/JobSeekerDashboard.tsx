'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { KanbanBoard } from "./KanbanBoard";
import { EmptyState } from "./EmptyState";
import { SearchFilterBar } from "./SearchFilterBar";
import { Skeleton } from "@/components/ui/skeleton";
import { getApplications } from "@/actions/applications";
import type { ApplicationCard, ApplicationStatus } from "@/lib/types";

const StatsSection = dynamic(() => import("./StatsSection").then(m => ({ default: m.StatsSection })), { loading: () => <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div> });

interface Props { userId: string; }

export function JobSeekerDashboard({ userId }: Props) {
  const [applications, setApplications] = useState<ApplicationCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ search: string; statuses: ApplicationStatus[] }>({ search: "", statuses: [] });

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
      <>
        <EmptyState />
      </>
    );
  }

  const isFiltering = filters.search || filters.statuses.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
