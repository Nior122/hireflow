'use client';

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { BarChart3, TrendingUp, Users, Briefcase, Download, Sparkles, Loader2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExecutiveDashboard, getCandidateIntelligence, getSourceDashboard, getAiInsightsDashboard, generateReport, exportAnalytics } from "@/actions/analytics";
import { toast } from "sonner";

// Lazy-load heavy chart components
const ResponsiveContainer = dynamic(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(m => ({ default: m.AreaChart })), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => ({ default: m.BarChart })), { ssr: false });
const PieChart = dynamic(() => import("recharts").then(m => ({ default: m.PieChart })), { ssr: false });
const LineChart = dynamic(() => import("recharts").then(m => ({ default: m.LineChart })), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => ({ default: m.YAxis })), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => ({ default: m.Tooltip })), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => ({ default: m.CartesianGrid })), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => ({ default: m.Area })), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => ({ default: m.Bar })), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => ({ default: m.Pie })), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => ({ default: m.Cell })), { ssr: false });
const Line = dynamic(() => import("recharts").then(m => ({ default: m.Line })), { ssr: false });

type Tab = "executive" | "pipeline" | "sources" | "candidates" | "insights" | "reports";

const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export function AnalyticsDashboard() {
  const [tab, setTab] = useState<Tab>("executive");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [candidateData, setCandidateData] = useState<any>(null);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [execRes, candRes, srcRes, insRes] = await Promise.all([
      getExecutiveDashboard(),
      getCandidateIntelligence(),
      getSourceDashboard(),
      getAiInsightsDashboard(),
    ]);
    if (execRes.success) setData(execRes.data);
    if (candRes.success) setCandidateData(candRes.data);
    if (srcRes.success) setSourceData(srcRes.data ?? []);
    if (insRes.success) setInsights(insRes.data ?? []);
    setLoading(false);
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    const res = await generateReport();
    if (res.success) { setReport(res.data); toast.success("Report generated!"); }
    else toast.error(res.error ?? "Failed");
    setGeneratingReport(false);
  }

  async function handleExport(format: "csv" | "json") {
    const res = await exportAnalytics(format);
    if (res.success) {
      const blob = new Blob([res.data!], { type: format === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hireflow-analytics.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported!");
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const metrics = data?.metrics;
  const funnel = data?.funnel ?? [];
  const sources = data?.sources ?? [];
  const recruiterPerf = data?.recruiterPerf ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-primary" /> Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Enterprise hiring intelligence & business insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} className="gap-1"><Download className="h-3 w-3" /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("json")} className="gap-1"><Download className="h-3 w-3" /> JSON</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg overflow-x-auto">
        {([
          { id: "executive", label: "Executive" },
          { id: "pipeline", label: "Funnel" },
          { id: "sources", label: "Sources" },
          { id: "candidates", label: "Candidates" },
          { id: "insights", label: "AI Insights" },
          { id: "reports", label: "Reports" },
        ] as { id: Tab; label: string }[]).map(t => (
          <Button key={t.id} variant={tab === t.id ? "default" : "ghost"} size="sm" className="h-7 text-xs whitespace-nowrap" onClick={() => setTab(t.id)}>{t.label}</Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Executive Dashboard */}
        {tab === "executive" && metrics && (
          <motion.div key="exec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[
                { label: "Open Positions", value: metrics.openPositions, icon: "📋", color: "text-blue-500" },
                { label: "Applications", value: metrics.totalApplications, icon: "📨", color: "text-emerald-500" },
                { label: "Interviews", value: metrics.totalInterviews, icon: "🎤", color: "text-purple-500" },
                { label: "Offers", value: metrics.totalOffers, icon: "📝", color: "text-amber-500" },
                { label: "Hires", value: metrics.totalHires, icon: "🎉", color: "text-emerald-600" },
                { label: "Offer Accept Rate", value: `${metrics.offerAcceptanceRate}%`, icon: "✅", color: "text-blue-500" },
                { label: "Avg Time to Hire", value: `${metrics.avgTimeToHire}d`, icon: "⏱️", color: "text-orange-500" },
                { label: "Pipeline Velocity", value: `${metrics.pipelineVelocity}%`, icon: "🚀", color: "text-violet-500" },
                { label: "Rejected", value: metrics.rejectedOffers, icon: "❌", color: "text-rose-500" },
                { label: "Recruiters", value: recruiterPerf.length, icon: "👥", color: "text-cyan-500" },
              ].map((kpi, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{kpi.icon}</span>
                    </div>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Monthly Trend */}
            {metrics.monthlyTrend && metrics.monthlyTrend.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Monthly Trend</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="applications" stroke="#2563eb" fill="#2563eb20" name="Applications" />
                        <Area type="monotone" dataKey="interviews" stroke="#8b5cf6" fill="#8b5cf620" name="Interviews" />
                        <Area type="monotone" dataKey="hires" stroke="#10b981" fill="#10b98120" name="Hires" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recruiter Leaderboard */}
            {recruiterPerf.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Recruiter Performance</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recruiterPerf.slice(0, 5).map((r: any, i: number) => (
                      <div key={r.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{r.email[0].toUpperCase()}</div>
                        <div className="flex-1"><p className="text-xs font-medium">{r.email}</p></div>
                        <Badge variant="secondary" className="text-[10px]">{r.candidatesReviewed} candidates</Badge>
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800">{r.hires} hires</Badge>
                        {r.avgRating > 0 && <Badge variant="secondary" className="text-[10px]">⭐ {r.avgRating}</Badge>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Hiring Funnel */}
        {tab === "pipeline" && (
          <motion.div key="funnel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Hiring Funnel</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} name="Candidates" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {funnel.filter((f: any) => f.stage !== "REJECTED").map((f: any) => (
                <Card key={f.stage}>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{f.count}</p>
                    <p className="text-xs font-medium text-muted-foreground">{f.stage}</p>
                    {f.conversion < 100 && <p className="text-[10px] text-muted-foreground">{f.conversion}% conversion</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sources */}
        {tab === "sources" && (
          <motion.div key="sources" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            {sourceData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Applications by Source</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sourceData} dataKey="applications" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}>
                            {sourceData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-sm">Conversion by Source</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceData}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="applications" fill="#2563eb" name="Applications" />
                          <Bar dataKey="hires" fill="#10b981" name="Hires" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        )}

        {/* Candidate Intelligence */}
        {tab === "candidates" && candidateData && (
          <motion.div key="candidates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Skills Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Top Skills</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={candidateData.topSkills.map(([name, count]: [string, number]) => ({ name, count }))} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Status Distribution</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={Object.entries(candidateData.statusDist).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {Object.keys(candidateData.statusDist).map((_: string, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Candidates */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Top Candidates (by Composite Score)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {candidateData.scores?.slice(0, 10).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${c.compositeScore >= 80 ? "bg-emerald-100 text-emerald-700" : c.compositeScore >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                        {c.compositeScore}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.status} · {c.keySkills?.slice(0, 3).join(", ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* AI Insights */}
        {tab === "insights" && (
          <motion.div key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">AI is analyzing your data. Insights will appear once you have more hiring activity.</p>
              </div>
            ) : insights.map((insight: any) => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${insight.type === "warning" ? "bg-amber-100 text-amber-600" : insight.type === "recommendation" ? "bg-blue-100 text-blue-600" : insight.type === "opportunity" ? "bg-emerald-100 text-emerald-600" : "bg-violet-100 text-violet-600"}`}>
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold">{insight.title}</h3>
                        <Badge variant="outline" className="text-[9px]">{insight.confidence}% confidence</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                      {insight.action && (
                        <Button size="sm" variant="outline" className="mt-2 h-6 text-[10px] gap-1"><ArrowUpRight className="h-2.5 w-2.5" /> {insight.action}</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <motion.div key="reports" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm">AI Report Generator</h3>
                    <p className="text-xs text-muted-foreground">Generate a comprehensive hiring report using AI</p>
                  </div>
                  <Button onClick={handleGenerateReport} disabled={generatingReport} className="gap-2">
                    {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {generatingReport ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
                {report && (
                  <div className="p-4 rounded-xl bg-muted/30 border prose prose-sm max-w-none text-sm">
                    <div className="whitespace-pre-wrap leading-relaxed">{report}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
