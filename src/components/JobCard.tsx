'use client';

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Bookmark, BookmarkCheck, Plus, Building2, MapPin, DollarSign, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { saveJob, importJobDirectlyToKanban } from "@/actions/discover";
import type { JobResult } from "@/lib/types";

interface Props {
  job: JobResult;
  isSaved: boolean;
  onClick: () => void;
  onSaved: (job: JobResult) => void;
  onImported: (job: JobResult) => void;
}

export function JobCard({ job, isSaved, onClick, onSaved, onImported }: Props) {
  const [saving, startSave] = useTransition();
  const [importing, startImport] = useTransition();
  const [imported, setImported] = useState(false);

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (isSaved) return;
    startSave(async () => {
      const result = await saveJob(job);
      if (result.success) {
        toast.success("Job saved!");
        onSaved(job);
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  function handleImport(e: React.MouseEvent) {
    e.stopPropagation();
    if (imported) return;
    startImport(async () => {
      const result = await importJobDirectlyToKanban(job);
      if (result.success) {
        toast.success("Job added to your Kanban board!");
        setImported(true);
        onImported(job);
      } else {
        toast.error(result.error ?? "Failed to import");
      }
    });
  }

  function formatSalary(min: number | null, max: number | null, currency?: string | null) {
    if (!min && !max) return null;
    const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const skills = Array.isArray(job.skills) ? job.skills : [];

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden h-full"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt={`${job.company} logo`}
              className="h-10 w-10 rounded-lg object-cover bg-muted flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary/60" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{job.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{job.company}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {job.location && (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <MapPin className="h-2.5 w-2.5" /> {job.location.length > 25 ? job.location.slice(0, 25) + "..." : job.location}
            </Badge>
          )}
          {job.remoteType && job.remoteType !== "any" && (
            <Badge variant="secondary" className="text-[10px] capitalize">{job.remoteType}</Badge>
          )}
          {salary && (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <DollarSign className="h-2.5 w-2.5" /> {salary}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px]">{job.source}</Badge>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 4).map(skill => (
              <Badge key={skill} variant="outline" className="text-[9px] px-1.5 py-0">{skill}</Badge>
            ))}
            {skills.length > 4 && <span className="text-[9px] text-muted-foreground">+{skills.length - 4}</span>}
          </div>
        )}

        {job.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{job.description.slice(0, 200)}</p>
        )}

        {job.postedAt && (
          <p className="text-[10px] text-muted-foreground">
            Posted {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
          </p>
        )}

        <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={handleSave}
            disabled={saving || isSaved}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : isSaved ? <BookmarkCheck className="h-3 w-3 text-primary" /> : <Bookmark className="h-3 w-3" />}
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={handleImport}
            disabled={importing || imported}
          >
            {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {imported ? "Imported" : "Add to Kanban"}
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); if (job.applicationUrl) window.open(job.applicationUrl, "_blank"); }}
            disabled={!job.applicationUrl}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
