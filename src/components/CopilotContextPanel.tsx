'use client';

import { useState, useEffect } from "react";
import { formatDistanceToNow, isPast } from "date-fns";
import { Bell, Star, Users, BarChart3, Mail } from "lucide-react";
import { getApplications } from "@/actions/applications";
import { getReminders } from "@/actions/reminders";
import { getSavedJobs } from "@/actions/discover";
import { getCareerScore } from "@/actions/copilot";
import { Badge } from "@/components/ui/badge";
import type { ApplicationCard } from "@/lib/types";

interface Props {
  role: string;
}

export function CopilotContextPanel({ role }: Props) {
  const [apps, setApps] = useState<ApplicationCard[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [appsRes, remindersRes, savedRes] = await Promise.all([
        getApplications(),
        getReminders(),
        role !== "EMPLOYER" ? getSavedJobs() : Promise.resolve({ success: false }),
      ]);
      if (appsRes.success) setApps(appsRes.data ?? []);
      if (remindersRes.success) setReminders(remindersRes.data ?? []);
      if (savedRes && savedRes.success) setSavedJobs(savedRes.data ?? []);

      if (role !== "EMPLOYER") {
        const scoreRes = await getCareerScore();
        if (scoreRes.success) setScore(scoreRes.data!.score);
      }

      setLoading(false);
    }
    load();
  }, [role]);

  const upcomingReminders = reminders.filter((r: any) => !r.isCompleted).slice(0, 5);
  const overdueReminders = upcomingReminders.filter((r: any) => isPast(new Date(r.dueDate)));
  const interviews = apps.filter(a => a.status === "INTERVIEW");
  const offers = apps.filter(a => a.status === "OFFER");

  const countByStatus: Record<string, number> = {};
  apps.forEach(a => { countByStatus[a.status] = (countByStatus[a.status] ?? 0) + 1; });

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="h-20 bg-muted rounded animate-pulse" />
        <div className="h-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto text-sm">
      {role !== "EMPLOYER" && (
        <>
          {/* Career Score */}
          {score !== null && (
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Career Score</p>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-bold ${score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-rose-500"}`}>
                  {score}
                </span>
                <span className="text-[10px] text-muted-foreground mb-1">/100</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          )}

          {/* Applications Summary */}
          <div>
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Applications</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(countByStatus).map(([status, count]) => (
                <div key={status} className="p-2 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs font-bold">{count}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interviews */}
          {interviews.length > 0 && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Upcoming Interviews</h4>
              {interviews.slice(0, 3).map(app => (
                <div key={app.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 mb-1">
                  <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium truncate">{app.company}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{app.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reminders */}
          {upcomingReminders.length > 0 && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Reminders
                {overdueReminders.length > 0 && (
                  <Badge className="ml-1 text-[8px] bg-destructive/10 text-destructive">{overdueReminders.length} overdue</Badge>
                )}
              </h4>
              {upcomingReminders.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 mb-1">
                  <Bell className={`h-3 w-3 flex-shrink-0 ${isPast(new Date(r.dueDate)) ? "text-destructive" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="text-[11px] truncate">{r.title}</p>
                    <p className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(r.dueDate), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved Jobs */}
          {savedJobs.length > 0 && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Saved Jobs</h4>
              <p className="text-xs">{savedJobs.length} jobs saved from job discovery</p>
            </div>
          )}
        </>
      )}

      {role === "EMPLOYER" && (
        <>
          <div>
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Pipeline</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(countByStatus).map(([status, count]) => (
                <div key={status} className="p-2 rounded-lg bg-muted/30 text-center">
                  <p className="text-xs font-bold">{count}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{status}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <Mail className="h-3 w-3 text-primary" />
                <span className="text-xs">Review pending replies</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <Users className="h-3 w-3 text-primary" />
                <span className="text-xs">View new candidates</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <BarChart3 className="h-3 w-3 text-primary" />
                <span className="text-xs">Hiring metrics</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
