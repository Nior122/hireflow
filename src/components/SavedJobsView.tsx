'use client';

import { useState, useTransition, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { BookmarkCheck, Trash2, Loader2, ExternalLink, Building2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { deleteSavedJob, importSavedJobToKanban, getSavedJobs } from "@/actions/discover";
import type { SavedJobData } from "@/lib/types";

interface Props {
  jobs: SavedJobData[];
  loading: boolean;
  onLoadSaved: () => void;
  onRemoveJob: (id: string) => void;
  onJobClick: (job: SavedJobData) => void;
}

export function SavedJobsView({ jobs, loading, onLoadSaved, onRemoveJob, onJobClick }: Props) {
  const [search, setSearch] = useState("");
  const [deleting, startDelete] = useTransition();
  const [importing, startImport] = useTransition();
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  useEffect(() => { onLoadSaved(); }, [onLoadSaved]);

  const filtered = search
    ? jobs.filter(j => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()))
    : jobs;

  function handleDelete(id: string) {
    startDelete(async () => {
      const result = await deleteSavedJob(id);
      if (result.success) { toast.success("Job removed"); onRemoveJob(id); }
      else toast.error(result.error ?? "Failed to remove");
    });
  }

  function handleImport(id: string) {
    if (importedIds.has(id)) return;
    startImport(async () => {
      const result = await importSavedJobToKanban(id);
      if (result.success) { toast.success("Job added to Kanban!"); setImportedIds(prev => new Set([...prev, id])); }
      else toast.error(result.error ?? "Failed to import");
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search saved jobs..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="h-9"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookmarkCheck className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">{jobs.length === 0 ? "No saved jobs yet" : "No matching saved jobs"}</p>
          <p className="text-sm mt-1">Search for jobs and save them to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job, i) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="p-4 rounded-xl border bg-card hover:shadow-md transition-all cursor-pointer"
              onClick={() => onJobClick(job)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{job.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {job.location && <Badge variant="secondary" className="text-[10px] gap-0.5"><MapPin className="h-2.5 w-2.5" /> {job.location}</Badge>}
                <Badge variant="secondary" className="text-[10px]">{job.source}</Badge>
                {job.importedToKanban && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600">Imported</Badge>}
              </div>
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                {!job.importedToKanban && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleImport(job.id); }} disabled={importing}>
                    {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Import
                  </Button>
                )}
                <div className="flex-1" />
                {job.applicationUrl && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); window.open(job.applicationUrl!, "_blank"); }}><ExternalLink className="h-3 w-3" /></Button>
                )}
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }} disabled={deleting}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
