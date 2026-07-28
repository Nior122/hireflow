'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, Pencil, Search, ArrowUp } from "lucide-react";
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
            {result}
          </div>
        </div>
      )}
    </div>
  );
}
