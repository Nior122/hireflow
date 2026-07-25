'use client';

import { Target, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AtsResult } from "@/lib/resume/ats";

interface Props { result: AtsResult; }

export function AtsPanel({ result }: Props) {
  function getScoreColor(score: number) {
    if (score >= 70) return "text-emerald-500";
    if (score >= 40) return "text-amber-500";
    return "text-rose-500";
  }

  function getScoreBg(score: number) {
    if (score >= 70) return "bg-emerald-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-rose-500";
  }

  return (
    <div className="p-4 space-y-4">
      {/* Overall Score */}
      <div className="text-center p-4 rounded-xl bg-muted/30">
        <Target className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
        <p className={`text-3xl font-bold ${getScoreColor(result.overallScore)}`}>{result.overallScore}</p>
        <p className="text-[10px] text-muted-foreground">ATS Score</p>
        <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${getScoreBg(result.overallScore)}`} style={{ width: `${result.overallScore}%` }} />
        </div>
      </div>

      {/* Breakdown */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Breakdown</p>
        <div className="space-y-2">
          {result.breakdown.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-[11px] font-medium">{item.label}</p>
                <p className={`text-[10px] font-bold ${getScoreColor(item.score)}`}>{item.score}/{item.max}</p>
              </div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${getScoreBg(item.score)}`} style={{ width: `${item.score}%` }} />
              </div>
              {item.details.map((d, di) => (
                <p key={di} className="text-[9px] text-muted-foreground mt-0.5">{d}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Suggestions</p>
          <div className="space-y-1.5">
            {result.suggestions.map((s, i) => (
              <div key={i} className={cn("p-2 rounded-lg text-[10px]", s.priority === "high" ? "bg-rose-500/5 text-rose-600" : "bg-amber-500/5 text-amber-600")}>
                <div className="flex items-center gap-1 mb-0.5">
                  {s.priority === "high" ? <AlertTriangle className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
                  <span className="font-medium capitalize">{s.priority}</span>
                </div>
                {s.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
