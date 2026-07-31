'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, AlertTriangle, Lightbulb, Loader2, Target, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { analyzeJobMatch } from "@/actions/discover";
import type { JobResult, AiMatchResult } from "@/lib/types";

interface Props {
  job: JobResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobMatchAnalysis({ job, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AiMatchResult | null>(null);

  function handleAnalyze() {
    startTransition(async () => {
      const res = await analyzeJobMatch(
        job.description || "",
        job.title,
        job.company
      );
      if (res.success) {
        if (res.data) setResult(res.data);
        toast.success("Analysis complete!");
      } else {
        toast.error(res.error ?? "Failed to analyze");
      }
    });
  }

  function getMatchColor(pct: number) {
    if (pct >= 80) return "text-emerald-500";
    if (pct >= 60) return "text-amber-500";
    return "text-rose-500";
  }

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setResult(null); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Match Analysis — {job.title}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Analyze how well your resume matches the <strong>{job.title}</strong> position at <strong>{job.company}</strong>.
            </p>
            <Button onClick={handleAnalyze} disabled={isPending} className="w-full gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isPending ? "Analyzing..." : "Analyze Match"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Match Score */}
            <div className="text-center p-6 rounded-xl bg-muted/30">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className={`text-4xl font-bold ${getMatchColor(result.matchPercentage)}`}>
                {result.matchPercentage}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Match Score</p>
            </div>

            {/* Missing Skills */}
            {result.missingSkills.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Missing Skills
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingSkills.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {result.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Strengths
                </h4>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground p-2 rounded-lg bg-emerald-500/5 border-l-2 border-emerald-500/50">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {result.improvements.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Resume Improvements
                </h4>
                <ul className="space-y-1">
                  {result.improvements.map((b, i) => (
                    <li key={i} className="text-sm text-muted-foreground p-2 rounded-lg bg-primary/5 border-l-2 border-primary/50">{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interview Tips */}
            {result.interviewTips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Interview Tips</h4>
                <ul className="space-y-1">
                  {result.interviewTips.map((t, i) => (
                    <li key={i} className="text-sm text-muted-foreground p-2 rounded-lg bg-muted/30">{t}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="outline" onClick={() => setResult(null)} className="w-full">
              Analyze Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
