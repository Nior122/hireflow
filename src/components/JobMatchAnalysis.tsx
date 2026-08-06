'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, AlertTriangle, Lightbulb, Loader2, Target, CheckCircle2, GraduationCap, FileText, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
          <div className="space-y-6 pb-4">
            {/* Match Score */}
            <div className="text-center p-6 rounded-xl bg-muted/30">
              <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="flex justify-between text-sm mb-1 font-medium">
                <span>Overall Match</span>
                <span className={getMatchColor(result.matchPercentage)}>{result.matchPercentage}%</span>
              </div>
              <Progress value={result.matchPercentage} className="h-2" />
            </div>

            <Tabs defaultValue="skills">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
              </TabsList>
              
              <TabsContent value="skills" className="space-y-4 pt-4">
                {/* Matched Skills */}
                {result.matchedSkills?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Matched Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.matchedSkills.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Priority Skills */}
                {result.prioritySkills?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 mt-4">
                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                      Critical Missing Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.prioritySkills.map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-rose-500/10 text-rose-700 dark:text-rose-400">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Missing Skills */}
                {result.missingSkills?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 mt-4">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Other Missing Skills
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.missingSkills.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-muted-foreground">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="learning" className="space-y-4 pt-4">
                {/* Courses */}
                {result.recommendedCourses?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <GraduationCap className="h-4 w-4 text-blue-500" />
                      Recommended Courses
                    </h4>
                    <ul className="space-y-2">
                      {result.recommendedCourses.map((c, i) => (
                        <li key={i} className="text-sm flex gap-2 items-start text-muted-foreground p-3 rounded-lg bg-blue-500/5 border-l-2 border-blue-500/50">
                          <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Certifications */}
                {result.recommendedCertifications?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 mt-4">
                      <FileText className="h-4 w-4 text-purple-500" />
                      Recommended Certifications
                    </h4>
                    <ul className="space-y-2">
                      {result.recommendedCertifications.map((c, i) => (
                        <li key={i} className="text-sm flex gap-2 items-start text-muted-foreground p-3 rounded-lg bg-purple-500/5 border-l-2 border-purple-500/50">
                          <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-purple-500" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resume" className="space-y-4 pt-4">
                {/* Resume Changes */}
                {result.resumeChanges?.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Actionable Resume Changes
                    </h4>
                    <ul className="space-y-2">
                      {result.resumeChanges.map((b, i) => (
                        <li key={i} className="text-sm text-muted-foreground p-3 rounded-lg bg-primary/5 border-l-2 border-primary/50 flex gap-2 items-start">
                          <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">{i+1}</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No specific resume changes recommended.</p>
                )}
              </TabsContent>
            </Tabs>

            <Button variant="outline" onClick={() => setResult(null)} className="w-full">
              Analyze Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
