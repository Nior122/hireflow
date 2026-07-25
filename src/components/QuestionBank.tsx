'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function QuestionBank() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, startTransition] = useTransition();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("Software Engineer");
  const [type, setType] = useState("Technical");
  const [difficulty, setDifficulty] = useState("Medium");
  const [count, setCount] = useState("5");

  function handleGenerate() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/interview/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate_questions",
            data: { company, role, type, difficulty, count: Number(count) },
          }),
        });
        const data = await res.json();
        if (data.result?.questions) {
          setQuestions(data.result.questions);
          toast.success(`Generated ${data.result.questions.length} questions`);
        } else if (typeof data.result === "string") {
          toast.error("Could not parse questions. Try again.");
        } else {
          setQuestions(data.result?.questions ?? []);
        }
      } catch { toast.error("Failed to generate"); }
    });
  }

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="p-4 rounded-xl border bg-card space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Question Generator</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company (optional)" className="h-9" />
          <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Role" className="h-9" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Technical", "Behavioral", "System Design", "Coding", "Culture Fit", "Leadership", "Frontend", "Backend", "DevOps", "Data Structures"].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{["Easy", "Medium", "Hard"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={loading} className="h-9 gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border bg-card overflow-hidden">
            <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
              {expandedIdx === i ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{q.question}</p>
                <div className="flex gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[9px]">{q.category}</Badge>
                  <Badge variant="outline" className="text-[9px]">{q.difficulty}</Badge>
                  {q.tags?.map((t: string) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                </div>
              </div>
            </button>
            {expandedIdx === i && q.answerGuide && (
              <div className="px-4 pb-4 pt-0 border-t">
                <p className="text-xs font-medium text-muted-foreground mt-3 mb-1">Answer Guide</p>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{q.answerGuide}</p>
              </div>
            )}
          </div>
        ))}
        {questions.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Generate questions to start practicing</p>
          </div>
        )}
      </div>
    </div>
  );
}
