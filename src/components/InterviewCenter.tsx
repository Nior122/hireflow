'use client';

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { Calendar, Plus, Play, BarChart3, FileText, CheckCircle, XCircle, Clock, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getInterviews, createInterview, deleteInterview, updateInterview, getInterviewAnalytics } from "@/actions/interviews";
import { MockInterview } from "./MockInterview";
import { QuestionBank } from "./QuestionBank";

type Tab = "dashboard" | "mock" | "questions";

const INTERVIEW_TYPES = [
  "PHONE_SCREEN", "TECHNICAL", "HR", "BEHAVIORAL", "SYSTEM_DESIGN",
  "PAIR_PROGRAMMING", "MANAGER_ROUND", "EXECUTIVE", "FINAL_ROUND", "ASSESSMENT",
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  RESCHEDULED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  MISSED: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export function InterviewCenter() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [interviews, setInterviews] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [intRes, analyticsRes] = await Promise.all([getInterviews(), getInterviewAnalytics()]);
    if (intRes.success) setInterviews(intRes.data ?? []);
    if (analyticsRes.success) setAnalytics(analyticsRes.data);
    setLoading(false);
  }

  async function handleCreate(data: any) {
    const result = await createInterview(data);
    if (result.success) { setCreateOpen(false); loadData(); }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const result = await deleteInterview(id);
    if (result.success) loadData();
    setDeleting(null);
  }

  async function handleComplete(id: string) {
    await updateInterview(id, { status: "COMPLETED" });
    loadData();
  }

  const upcoming = interviews.filter(i => i.status === "SCHEDULED" && i.scheduledAt);
  const completed = interviews.filter(i => i.status === "COMPLETED");
  const missed = interviews.filter(i => i.status === "MISSED");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6 text-primary" /> Interview Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Prepare, practice, and ace your interviews</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            <Button variant={tab === "dashboard" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setTab("dashboard")}>Dashboard</Button>
            <Button variant={tab === "mock" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setTab("mock")}><Play className="h-3 w-3" /> Mock Interview</Button>
            <Button variant={tab === "questions" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setTab("questions")}>Question Bank</Button>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setCreateOpen(true)}><Plus className="h-3 w-3" /> Schedule Interview</Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* Stats */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{analytics.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total Interviews</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-500">{analytics.scheduled}</p>
                  <p className="text-[10px] text-muted-foreground">Upcoming</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-500">{analytics.completed}</p>
                  <p className="text-[10px] text-muted-foreground">Completed</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-amber-500">{analytics.avgScore}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Practice Score</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold">{analytics.totalPractices}</p>
                  <p className="text-[10px] text-muted-foreground">Practice Sessions</p>
                </CardContent></Card>
              </div>
            )}

            {/* Upcoming */}
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> Upcoming Interviews</h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming interviews scheduled</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcoming.map(int => (
                    <Card key={int.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm">{int.company}</h4>
                            <p className="text-xs text-muted-foreground">{int.position}</p>
                          </div>
                          <Badge className={STATUS_COLORS[int.status]}>{int.status}</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p><Badge variant="outline" className="text-[9px] mr-1">{int.interviewType.replace(/_/g, " ")}</Badge> Round {int.interviewRound}</p>
                          {int.scheduledAt && <p>📅 {format(new Date(int.scheduledAt), "MMM d, yyyy 'at' h:mm a")}</p>}
                          {int.location && <p>📍 {int.location}</p>}
                          {int.interviewerName && <p>👤 {int.interviewerName}</p>}
                        </div>
                        <div className="flex gap-1 mt-3 pt-2 border-t" onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => handleComplete(int.id)}><CheckCircle className="h-3 w-3" /> Complete</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => handleDelete(int.id)} disabled={deleting === int.id}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Completed & Missed */}
            {completed.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /> Completed ({completed.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {completed.slice(0, 6).map(int => (
                    <Card key={int.id} className="opacity-80">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div><p className="font-medium text-sm">{int.company}</p><p className="text-xs text-muted-foreground">{int.position}</p></div>
                          <Badge className={STATUS_COLORS[int.status]}>{int.interviewType.replace(/_/g, " ")}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Quick View */}
            {analytics && Object.keys(analytics.byCategory).length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Practice Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analytics.byCategory).map(([cat, count]) => (
                    <Badge key={cat} variant="secondary" className="text-xs">{cat}: {String(count)}</Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {tab === "mock" && (
          <motion.div key="mock" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <MockInterview />
          </motion.div>
        )}

        {tab === "questions" && (
          <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <QuestionBank />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
          <CreateInterviewForm onSubmit={handleCreate} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateInterviewForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [type, setType] = useState("TECHNICAL");
  const [round, setRound] = useState("1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewerName, setInterviewerName] = useState("");

  function handleSubmit() {
    if (!company.trim() || !position.trim()) return;
    onSubmit({
      company: company.trim(), position: position.trim(), interviewType: type,
      interviewRound: Number(round), scheduledAt: scheduledAt || undefined,
      duration: Number(duration), location: location || undefined,
      meetingLink: meetingLink || undefined, interviewerName: interviewerName || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Company *</Label><Input value={company} onChange={e => setCompany(e.target.value)} required /></div>
        <div className="space-y-1"><Label className="text-xs">Position *</Label><Input value={position} onChange={e => setPosition(e.target.value)} required /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={v => setType(v ?? "")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            {INTERVIEW_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">Round</Label><Input type="number" value={round} onChange={e => setRound(e.target.value)} min="1" /></div>
        <div className="space-y-1"><Label className="text-xs">Duration (min)</Label><Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="15" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Date & Time</Label><Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Interviewer</Label><Input value={interviewerName} onChange={e => setInterviewerName(e.target.value)} placeholder="Name" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Office / Remote" /></div>
        <div className="space-y-1"><Label className="text-xs">Meeting Link</Label><Input value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://..." /></div>
      </div>
      <Button onClick={handleSubmit} disabled={!company.trim() || !position.trim()} className="w-full">Schedule Interview</Button>
    </div>
  );
}
