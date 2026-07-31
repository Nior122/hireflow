'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, BarChart3, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { analyzeMatch } from "@/actions/resume";

interface Props {
  company: string;
  role: string;
  jobDescription: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MatchResult {
  matchPercentage: number;
  missingKeywords: string[];
  tailoredBullets: string[];
}

export function ResumeMatcher({ company, role, jobDescription, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);

  function handleAnalyze() {
    if (!resumeText.trim()) {
      toast.error("Please enter your resume text");
      return;
    }
    startTransition(async () => {
      const response = await analyzeMatch(resumeText, jobDescription || `Role: ${role} at ${company}`);
      if (response.success) {
        if (response.data) setResult(response.data);
        toast.success("Analysis complete!");
      } else {
        toast.error(response.error ?? "Failed to analyze");
      }
    });
  }

  function getMatchColor(pct: number) {
    if (pct >= 80) return "text-emerald-500";
    if (pct >= 60) return "text-amber-500";
    return "text-rose-500";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setResult(null); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Resume Match - {company}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your resume text below and we'll analyze how well it matches the <strong>{role}</strong> position at <strong>{company}</strong>.
            </p>
            <div className="space-y-2">
              <Label className="text-sm">Your Resume Text</Label>
              <Textarea
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                placeholder="Paste your resume content here..."
                rows={8}
                className="font-mono text-xs"
              />
            </div>
            {jobDescription && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">Job Description Preview</p>
                <p className="text-xs text-muted-foreground line-clamp-3">{jobDescription}</p>
              </div>
            )}
            <Button onClick={handleAnalyze} disabled={isPending || !resumeText.trim()} className="w-full gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isPending ? "Analyzing..." : "Analyze Match"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center p-6 rounded-xl bg-muted/30">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className={`text-4xl font-bold ${getMatchColor(result.matchPercentage)}`}>
                {result.matchPercentage}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">Match Score</p>
            </div>

            {result.missingKeywords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Missing Keywords
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.missingKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.tailoredBullets.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-emerald-500" />
                  Suggested Improvements
                </h4>
                <ul className="space-y-2">
                  {result.tailoredBullets.map((bullet, i) => (
                    <li key={i} className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 border-l-2 border-emerald-500/50">
                      {bullet}
                    </li>
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