'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { X, Bookmark, BookmarkCheck, Plus, ExternalLink, MapPin, DollarSign, Building2, Globe, Sparkles, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveJob, importJobDirectlyToKanban } from "@/actions/discover";
import { JobMatchAnalysis } from "./JobMatchAnalysis";
import type { JobResult } from "@/lib/types";

interface Props {
  job: JobResult | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onJobSaved: (job: JobResult) => void;
  onJobImported: (job: JobResult) => void;
}

export function JobDetailDrawer({ job, isOpen, onClose, isSaved, onJobSaved, onJobImported }: Props) {
  const [saving, startSave] = useTransition();
  const [importing, startImport] = useTransition();
  const [imported, setImported] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);

  if (!isOpen || !job) return null;

  function handleSave() {
    if (isSaved) return;
    startSave(async () => {
      const result = await saveJob(job!);
      if (result.success) { toast.success("Job saved!"); onJobSaved(job!); }
      else toast.error(result.error ?? "Failed to save");
    });
  }

  function handleImport() {
    if (imported) return;
    startImport(async () => {
      const result = await importJobDirectlyToKanban(job!);
      if (result.success) {
        toast.success("Job added to your Kanban board!");
        setImported(true);
        onJobImported(job!);
      } else toast.error(result.error ?? "Failed to import");
    });
  }

  const skills = Array.isArray(job.skills) ? job.skills : [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-background border-l shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {job.companyLogo ? (
                <img src={job.companyLogo} alt="" className="h-10 w-10 rounded-lg object-cover bg-muted flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-primary/60" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">{job.title}</h2>
                <p className="text-sm text-muted-foreground truncate">{job.company}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Quick Info */}
          <div className="flex flex-wrap gap-2">
            {job.location && <Badge variant="secondary" className="gap-1"><MapPin className="h-3 w-3" /> {job.location}</Badge>}
            {job.remoteType && job.remoteType !== "any" && <Badge variant="secondary" className="capitalize">{job.remoteType}</Badge>}
            {job.salaryMin || job.salaryMax ? (
              <Badge variant="secondary" className="gap-1">
                <DollarSign className="h-3 w-3" />
                {job.salaryMin && job.salaryMax ? `$${Math.round(job.salaryMin / 1000)}k - $${Math.round(job.salaryMax / 1000)}k` : job.salaryMin ? `From $${Math.round(job.salaryMin / 1000)}k` : `Up to $${Math.round(job.salaryMax! / 1000)}k`}
              </Badge>
            ) : null}
            <Badge variant="secondary">{job.source}</Badge>
            {job.postedAt && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(job.postedAt), { addSuffix: true })}
              </Badge>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.map(skill => (
                  <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Job Description</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {job.description}
              </div>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Requirements</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {job.requirements}
              </div>
            </div>
          )}

          {/* Company Info */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Company</h3>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{job.company}</span>
              {job.companyWebsite && (
                <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || isSaved} variant={isSaved ? "outline" : "default"} className="flex-1 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? "Saved" : "Save Job"}
              </Button>
              <Button onClick={handleImport} disabled={importing || imported} variant={imported ? "outline" : "default"} className="flex-1 gap-2">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {imported ? "Imported" : "Import to Kanban"}
              </Button>
            </div>
            <Button onClick={() => setMatchOpen(true)} variant="outline" className="w-full gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Analyze Match
            </Button>
            {job.applicationUrl && (
              <Button variant="outline" className="w-full gap-2" onClick={() => window.open(job.applicationUrl, "_blank")}>
                <ExternalLink className="h-4 w-4" /> Open Original Posting
              </Button>
            )}
          </div>
        </div>
      </div>

      <JobMatchAnalysis
        job={job}
        open={matchOpen}
        onOpenChange={setMatchOpen}
      />
    </>
  );
}
