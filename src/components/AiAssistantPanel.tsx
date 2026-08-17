'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, Pencil, Search, ArrowUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Props {
  resumeText: string;
  onResult: (result: string) => void;
}

const AI_ACTIONS = [
  { id: "improve_summary", label: "Improve Summary", icon: Wand2, description: "Make your summary more impactful" },
  { id: "rewrite_bullets", label: "Rewrite Bullets", icon: Pencil, description: "Strengthen achievement bullets" },
  { id: "generate_achievements", label: "Generate Achievements", icon: ArrowUp, description: "Create quantified achievement bullets" },
  { id: "fix_grammar", label: "Fix Grammar", icon: Pencil, description: "Correct errors and improve clarity" },
  { id: "ats_keywords", label: "ATS Keywords", icon: Search, description: "Extract and suggest keywords" },
  { id: "highlight_skills", label: "Highlight Skills", icon: Sparkles, description: "Highlight skills based on Career Profile" },
];

export function AiAssistantPanel({ resumeText, onResult }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [extra, setExtra] = useState("");

  function handleAction(actionId: string) {
    if (!resumeText.trim()) {
      toast.error("Add resume content first");
      return;
    }
    setSelectedAction(actionId);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/resume/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: actionId,
            resumeText,
            jobDescription: jobDescription || undefined,
            extra: extra || undefined,
          }),
        });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          const text = typeof data.result === "string" ? data.result : JSON.stringify(data.result, null, 2);
          setResult(text);
          onResult(text);
        }
      } catch {
        toast.error("AI request failed");
      }
    });
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-medium">AI Assistant</p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-1.5">
        {AI_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-auto py-2 text-left"
              onClick={() => handleAction(action.id)}
              disabled={isPending}
            >
              <Icon className="h-3 w-3 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium">{action.label}</p>
                <p className="text-[9px] text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Loading */}
      {isPending && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Generating...</span>
        </div>
      )}

      {/* Result */}
      {result && !isPending && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-muted-foreground">Result</p>
          <div className="p-3 rounded-lg bg-muted/30 text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {(() => {
              try {
                const parsed = JSON.parse(result);
                if (parsed.not_in_profile && Array.isArray(parsed.not_in_profile) && parsed.not_in_profile.length > 0) {
                  return (
                    <div className="space-y-3">
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 flex flex-col gap-1">
                        <span className="font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Missing Skills
                        </span>
                        <span className="text-[10px]">
                          The following suggested skills are NOT in your Career Profile. You may want to add them if you have this experience:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {parsed.not_in_profile.map((s: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[9px] bg-amber-500/5 text-amber-500 border-amber-500/30">{s}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        {JSON.stringify({ ...parsed, not_in_profile: undefined }, null, 2)}
                      </div>
                    </div>
                  );
                }
                return result;
              } catch {
                return result;
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
