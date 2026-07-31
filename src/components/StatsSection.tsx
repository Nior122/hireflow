'use client';

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Building2, BarChart3 } from "lucide-react";
import { STATUS_LABELS, STATUS_ORDER, type ApplicationCard, type ApplicationStatus } from "@/lib/types";
import { differenceInDays } from "date-fns";

interface Props { applications: ApplicationCard[]; }

type Tab = "overview" | "insights";

export function StatsSection({ applications }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  const stats = useMemo(() => {
    if (!applications.length) return null;
    const total = applications.length;
    const byStatus = STATUS_ORDER.map(status => ({
      name: STATUS_LABELS[status],
      count: applications.filter(a => a.status === status).length,
      fill: status === "UNAPPLIED" ? "#6b7280" : status === "WISHLIST" ? "#3b82f6" : status === "APPLIED" ? "#eab308" : status === "INTERVIEW" ? "#8b5cf6" : status === "OFFER" ? "#10b981" : "#ef4444",
    }));
    const interviews = applications.filter(a => a.status === "INTERVIEW").length;
    const offers = applications.filter(a => a.status === "OFFER").length;
    const rejected = applications.filter(a => a.status === "REJECTED").length;
    return { total, byStatus, interviews, offers, rejected };
  }, [applications]);

  const insights = useMemo(() => {
    if (!applications.length) return null;

    // Average time to interview
    const interviewedApps = applications.filter(a => a.status === "INTERVIEW" || a.status === "OFFER" || a.status === "REJECTED");
    const avgDaysToInterview = interviewedApps.length > 0
      ? Math.round(interviewedApps.reduce((sum, a) => sum + differenceInDays(new Date(), new Date(a.createdAt)), 0) / interviewedApps.length)
      : 0;

    const total = applications.length;
    // Response rate (interviewed + offers + rejected) / total
    const responded = applications.filter(a => a.status !== "UNAPPLIED" && a.status !== "WISHLIST").length;
    const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

    // Success rate (offers / responded)
    const successRate = responded > 0 ? Math.round((stats!.offers / responded) * 100) : 0;

    // Applications per company
    const companyMap = new Map<string, number>();
    applications.forEach(a => {
      companyMap.set(a.company, (companyMap.get(a.company) ?? 0) + 1);
    });
    const topCompanies = Array.from(companyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Source breakdown
    const sourceMap = new Map<string, number>();
    applications.forEach(a => {
      const src = a.source || "Unknown";
      sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
    });
    const sources = Array.from(sourceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Weekly activity (last 4 weeks)
    const now = new Date();
    const weeklyData = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (w * 7 + 6));
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const count = applications.filter(a => {
        const d = new Date(a.createdAt);
        return d >= weekStart && d <= weekEnd;
      }).length;
      weeklyData.push({ week: `Week ${4 - w}`, applications: count });
    }

    return { avgDaysToInterview, responseRate, successRate, topCompanies, sources, weeklyData, total };
  }, [applications, stats]);

  if (!stats) return null;

  return (
    <div className="mb-8">
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          onClick={() => setTab("overview")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "overview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <BarChart3 className="h-4 w-4 inline mr-1.5" />
          Overview
        </button>
        <button
          onClick={() => setTab("insights")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === "insights" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <TrendingUp className="h-4 w-4 inline mr-1.5" />
          Insights
        </button>
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardDescription>Total</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl">{stats.total}</CardTitle></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Interviewing</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl text-purple-500">{stats.interviews}</CardTitle></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Offers</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl text-emerald-500">{stats.offers}</CardTitle></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Response Rate</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl">{stats.total > 0 ? Math.round(((stats.interviews + stats.offers) / stats.total) * 100) : 0}%</CardTitle></CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Applications by Status</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byStatus}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Insights Tab */}
      {tab === "insights" && insights && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Response Rate</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl text-blue-500">{insights.responseRate}%</CardTitle></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Success Rate</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl text-emerald-500">{insights.successRate}%</CardTitle></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Clock className="h-3 w-3" /> Avg Days to Response</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl text-amber-500">{insights.avgDaysToInterview}d</CardTitle></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Unique Companies</CardDescription></CardHeader>
              <CardContent><CardTitle className="text-3xl text-purple-500">{insights.topCompanies.length}</CardTitle></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Weekly Applications</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insights.weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="applications" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Top Companies</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.topCompanies} layout="vertical">
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Applications by Source</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {insights.sources.map(src => (
                  <div key={src.name} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Badge variant="secondary" className="text-xs">{src.name}</Badge>
                    <span className="text-lg font-bold">{src.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}