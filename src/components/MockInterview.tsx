'use client';

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Play, Send, Bot, Loader2, RotateCcw, Star, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savePractice, getJobApplicationPrepContext } from "@/actions/interviews";
import { getApplications } from "@/actions/applications";
import { ApplicationCard } from "@/lib/types";
import { Briefcase, Mail } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
  score?: number;
}

export function MockInterview() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [scores, setScores] = useState<number[]>([]);
  const [type, setType] = useState("Technical");
  const [difficulty, setDifficulty] = useState("Medium");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [completed, setCompleted] = useState(false);
  
  const [applications, setApplications] = useState<ApplicationCard[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("general");
  const [prepContext, setPrepContext] = useState<any>(null);
  const [report, setReport] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    getApplications().then(res => {
      if (res.success) setApplications(res.data ?? []);
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (activeJobId && activeJobId !== "general") {
      const app = applications.find(a => a.id === activeJobId);
      if (app) {
        setRole(app.role);
        setCompany(app.company);
        getJobApplicationPrepContext(app.id).then(res => {
          if (res.success) setPrepContext(res.data);
        });
      }
    } else {
      setPrepContext(null);
    }
  }, [activeJobId, applications]);

  async function startInterview() {
    setLoading(true);
    try {
      const res = await fetch("/api/interview/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mock_interview_start",
          data: { 
            type, 
            difficulty, 
            role: role || "Software Engineer", 
            company,
            jobRequirements: prepContext?.application?.notes || "",
            careerGaps: prepContext?.careerProfile?.skills?.join(", ") || ""
          },
        }),
      });
      const data = await res.json();
      const content = data.result || data.error || "Failed to start";
      setMessages([{ role: "assistant", content }]);
      setStarted(true);
      setQuestionNumber(1);
      // Extract question from the response
      const lines = content.split("\n").filter((l: string) => l.trim().length > 10);
      setCurrentQuestion(lines[lines.length - 1] || content.slice(-200));
      setLastQuestion(lines[lines.length - 1] || content.slice(-200));
    } catch { toast.error("Failed to start"); }
    setLoading(false);
  }

  async function submitAnswer() {
    if (!input.trim() || loading || completed) return;
    const answer = input.trim();
    setMessages(prev => [...prev, { role: "user", content: answer }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/interview/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mock_interview_continue",
          data: {
            previousQuestion: lastQuestion,
            answer,
            questionNumber,
            role: role || "Software Engineer",
            type,
            jobRequirements: prepContext?.application?.notes || "",
          },
        }),
      });
      const data = await res.json();
      const content = data.result || "No response";
      const isFinal = questionNumber >= 5 || content.toLowerCase().includes("final evaluation") || content.toLowerCase().includes("summary");

      // Extract score if present
      const scoreMatch = content.match(/overall.*?(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : undefined;
      if (score) setScores(prev => [...prev, score]);

      setMessages(prev => [...prev, { role: "assistant", content, score }]);

      if (isFinal) {
        setCompleted(true);
        const finalScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
        // Save practice session
        await savePractice({
          company,
          role: role || "Software Engineer",
          category: "Mock Interview",
          difficulty,
          question: "Mock Interview Session",
          userAnswer: messages.map(m => `${m.role}: ${m.content}`).join("\n\n") + `\n\nUser: ${answer}`,
          aiFeedback: { messages: messages.length + 1, scores },
          score: finalScore,
          jobApplicationId: activeJobId !== "general" ? activeJobId : undefined
        });
        toast.success("Interview practice saved!");
        
        // Generate post-interview learning report if job active
        if (activeJobId !== "general") {
           const reportRes = await fetch("/api/interview/ai", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               action: "generate_learning_report",
               data: { role, company, jobRequirements: prepContext?.application?.notes || "", score: finalScore }
             })
           });
           const reportData = await reportRes.json();
           setReport(reportData.result || "Report generation failed.");
        }
      } else {
        // Extract next question
        const lines = content.split("\n").filter((l: string) => l.trim().length > 10);
        const q = lines[lines.length - 1] || content.slice(-200);
        setCurrentQuestion(q);
        setLastQuestion(q);
        setQuestionNumber(prev => prev + 1);
      }
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Error occurred. Please try again." }]); }
    setLoading(false);
  }

  function resetInterview() {
    setStarted(false);
    setMessages([]);
    setQuestionNumber(0);
    setScores([]);
    setCompleted(false);
    setReport("");
  }

  if (!started) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Mock Interview</h2>
          <p className="text-sm text-muted-foreground">Practice with an AI interviewer. Get real-time feedback on your answers.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4" /> Interview Setup</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Preparation Mode</label>
                <Select value={activeJobId} onValueChange={(val) => setActiveJobId(val || "general")}>
                  <SelectTrigger><SelectValue placeholder="General Practice" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Practice</SelectItem>
                    {applications.map(app => (
                      <SelectItem key={app.id} value={app.id}>
                        {app.role} at {app.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-medium">Interview Type</label>
                  <Select value={type} onValueChange={v => setType(v ?? "")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    {["Technical", "Behavioral", "System Design", "HR", "Phone Screen"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent></Select>
                </div>
                <div className="space-y-1"><label className="text-xs font-medium">Difficulty</label>
                  <Select value={difficulty} onValueChange={v => setDifficulty(v ?? "")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    {["Easy", "Medium", "Hard"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent></Select>
                </div>
              </div>
              <div className="space-y-1"><label className="text-xs font-medium">Role</label><Input value={role} onChange={e => setRole(e.target.value)} placeholder="Software Engineer" disabled={activeJobId !== "general"} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Company</label><Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Google" disabled={activeJobId !== "general"} /></div>
            </div>
            <Button onClick={startInterview} disabled={loading} className="w-full gap-2 mt-4">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Mock Interview
            </Button>
          </div>
          
          <div className="space-y-4">
            {activeJobId !== "general" && prepContext ? (
              <div className="bg-muted/30 p-4 rounded-xl border space-y-4 h-full">
                <h3 className="font-semibold flex items-center gap-2 text-sm"><Bot className="h-4 w-4" /> AI Prep Context</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The AI is using this job&apos;s notes and your career profile gaps to tailor the interview questions specifically for {company}.
                </p>
                {prepContext.emails?.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h4 className="text-xs font-semibold flex items-center gap-1"><Mail className="h-3 w-3" /> Relevant Emails</h4>
                    {prepContext.emails.map((email: any) => (
                      <div key={email.id} className="text-xs p-2 bg-background border rounded-lg">
                        <p className="font-medium truncate">{email.subject}</p>
                        <p className="text-muted-foreground truncate">{email.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-muted/30 p-4 rounded-xl border flex items-center justify-center h-full text-center text-sm text-muted-foreground flex-col gap-2">
                <Bot className="h-8 w-8 opacity-20" />
                <p>Select an active job application to enable personalized interview prep based on your profile and job requirements.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
        <div className="flex items-center gap-3">
          <Badge variant="outline">{type}</Badge>
          <span className="text-xs text-muted-foreground">Question {Math.min(questionNumber, 5)}/5</span>
        </div>
        {completed && (
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold">Avg Score: {avgScore}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={resetInterview} className="gap-1"><RotateCcw className="h-3 w-3" /> New</Button>
      </div>

      {/* Messages */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot className="h-3.5 w-3.5 text-primary" /></div>
            )}
            <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 border"}`}>
              {msg.content}
              {msg.score && (
                <div className="mt-2 flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-bold">Score: {msg.score}/100</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /></div>
            <div className="px-4 py-3 bg-muted/50 border rounded-xl text-sm">Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!completed ? (
        <div className="flex gap-2 p-4 border-t">
          <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); } }} placeholder="Type your answer..." rows={2} className="resize-none" />
          <Button onClick={submitAnswer} disabled={loading || !input.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <div className="p-4 border-t space-y-4">
          {report && (
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-2">
              <h3 className="font-bold flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" /> Post-Interview Learning Report</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{report}</div>
            </div>
          )}
          <div className="text-center">
            <Button onClick={resetInterview} className="gap-2"><RotateCcw className="h-4 w-4" /> Start New Interview</Button>
          </div>
        </div>
      )}
    </div>
  );
}
