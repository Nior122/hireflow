'use client';

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Users, Plus, Mail, Clock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getOrganizations, createOrganization, getOrganization, inviteMember, getMembers, getAuditLogs, getJobPostings, createJobPosting } from "@/actions/organizations";
import type { OrgRole } from "@/lib/org/permissions";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner", ADMIN: "Admin", RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager", INTERVIEWER: "Interviewer", VIEWER: "Viewer",
};
const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RECRUITER: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  HIRING_MANAGER: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  INTERVIEWER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  VIEWER: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

type Tab = "overview" | "team" | "jobs" | "audit";

export function TeamDashboard() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("RECRUITER");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);

  useEffect(() => { loadOrgs(); }, []);

  async function loadOrgs() {
    const res = await getOrganizations();
    if (res.success && res.data) {
      setOrgs(res.data);
      if (res.data.length > 0) loadOrgDetail(res.data[0].id);
    }
    setLoading(false);
  }

  async function loadOrgDetail(orgId: string) {
    const [orgRes, auditRes, jobsRes] = await Promise.all([
      getOrganization(orgId),
      getAuditLogs(orgId, 20).catch(() => ({ success: false, data: [] })),
      getJobPostings(orgId).catch(() => ({ success: false, data: [] })),
    ]);
    if (orgRes.success) setCurrentOrg(orgRes.data);
    if (auditRes.success) setAuditLogs(auditRes.data ?? []);
    if (jobsRes.success) setJobPostings(jobsRes.data ?? []);
  }

  async function handleCreateOrg() {
    if (!newOrgName.trim() || !newOrgSlug.trim()) return;
    const res = await createOrganization(newOrgName.trim(), newOrgSlug.trim());
    if (res.success) { toast.success("Organization created!"); setCreateOpen(false); loadOrgs(); }
    else toast.error(res.error ?? "Failed");
  }

  async function handleInvite() {
    if (!currentOrg || !inviteEmail.trim()) return;
    const res = await inviteMember(currentOrg.id, inviteEmail.trim(), inviteRole as OrgRole);
    if (res.success) { toast.success("Invitation sent!"); setInviteOpen(false); setInviteEmail(""); loadOrgDetail(currentOrg.id); }
    else toast.error(res.error ?? "Failed");
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (orgs.length === 0) {
    return (
      <div className="text-center py-20">
        <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-xl font-bold mb-2">No Organization Yet</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Create an organization to start collaborating with your hiring team.</p>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Organization</Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1"><Label className="text-xs">Company Name</Label><Input value={newOrgName} onChange={e => { setNewOrgName(e.target.value); setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} placeholder="Acme Corp" /></div>
              <div className="space-y-1"><Label className="text-xs">URL Slug</Label><Input value={newOrgSlug} onChange={e => setNewOrgSlug(e.target.value)} placeholder="acme-corp" /></div>
              <Button onClick={handleCreateOrg} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const members = currentOrg?.members ?? [];
  const stats = {
    openJobs: jobPostings.filter(j => j.status === "PUBLISHED").length,
    totalJobs: jobPostings.length,
    teamSize: members.length,
    recentActions: auditLogs.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            {currentOrg?.name ?? "Team"}
            <Badge className={ROLE_COLORS[currentOrg?.myRole ?? "VIEWER"]}>{ROLE_LABELS[currentOrg?.myRole ?? "VIEWER"]}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Hiring team collaboration workspace</p>
        </div>
        <div className="flex items-center gap-2">
          {orgs.length > 1 && (
            <select className="h-9 px-3 rounded-lg border bg-background text-sm" value={currentOrg?.id} onChange={e => { const org = orgs.find(o => o.id === e.target.value); if (org) loadOrgDetail(org.id); }}>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="gap-1"><Mail className="h-3 w-3" /> Invite</Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1"><Plus className="h-3 w-3" /> New Org</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {(["overview", "team", "jobs", "audit"] as Tab[]).map(t => (
          <Button key={t} variant={tab === t ? "default" : "ghost"} size="sm" className="h-7 text-xs capitalize" onClick={() => setTab(t)}>
            {t === "overview" ? "Overview" : t === "team" ? "Team" : t === "jobs" ? "Job Postings" : "Audit Log"}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-blue-500">{stats.openJobs}</p><p className="text-[10px] text-muted-foreground">Open Jobs</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.totalJobs}</p><p className="text-[10px] text-muted-foreground">Total Jobs</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-emerald-500">{stats.teamSize}</p><p className="text-[10px] text-muted-foreground">Team Members</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.recentActions}</p><p className="text-[10px] text-muted-foreground">Recent Actions</p></CardContent></Card>
          </div>

          {/* Team Avatars */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Team Members</h3>
            <div className="flex flex-wrap gap-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {(m.user?.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{m.user?.email ?? "Unknown"}</p>
                    <Badge className={`text-[9px] ${ROLE_COLORS[m.role]}`}>{ROLE_LABELS[m.role]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {auditLogs.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">{(log.user?.email ?? "?")[0].toUpperCase()}</div>
                    <div className="flex-1"><p className="text-xs">{log.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</p></div>
                    <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "team" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Team Members ({members.length})</h3>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1"><Mail className="h-3 w-3" /> Invite Member</Button>
          </div>
          <div className="space-y-2">
            {members.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(m.user?.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.user?.email ?? "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge className={ROLE_COLORS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "jobs" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Job Postings ({jobPostings.length})</h3>
            <CreateJobPostingButton orgId={currentOrg?.id} onCreated={() => loadOrgDetail(currentOrg.id)} />
          </div>
          {jobPostings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No job postings yet</p>
          ) : (
            <div className="space-y-2">
              {jobPostings.map((job: any) => (
                <Card key={job.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{job.title}</p>
                      <p className="text-[10px] text-muted-foreground">{job.department ?? "General"} · {job.location ?? "Not specified"}</p>
                    </div>
                    <Badge variant={job.status === "PUBLISHED" ? "default" : "secondary"}>{job.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Audit Log</h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
          ) : (
            auditLogs.map((log: any) => (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">{(log.user?.email ?? "?")[0].toUpperCase()}</div>
                  <div className="flex-1">
                    <p className="text-xs"><strong>{log.user?.email ?? "Unknown"}</strong> {log.action.replace(/_/g, " ").toLowerCase()}</p>
                    <p className="text-[10px] text-muted-foreground">{log.entity} · {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Email Address</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" /></div>
            <div className="space-y-1"><Label className="text-xs">Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v ?? "")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["ADMIN", "RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "VIEWER"].map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent></Select>
            </div>
            <Button onClick={handleInvite} className="w-full">Send Invitation</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Org Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Company Name</Label><Input value={newOrgName} onChange={e => { setNewOrgName(e.target.value); setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} /></div>
            <div className="space-y-1"><Label className="text-xs">URL Slug</Label><Input value={newOrgSlug} onChange={e => setNewOrgSlug(e.target.value)} /></div>
            <Button onClick={handleCreateOrg} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateJobPostingButton({ orgId, onCreated }: { orgId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");

  async function handleCreate() {
    if (!title.trim()) return;
    const res = await createJobPosting(orgId, { title: title.trim(), department: department || undefined, location: location || undefined });
    if (res.success) { toast.success("Job posted!"); setOpen(false); setTitle(""); setDepartment(""); setLocation(""); onCreated(); }
    else toast.error(res.error ?? "Failed");
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1"><Plus className="h-3 w-3" /> Post Job</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Job Posting</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Job Title" />
            <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" />
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" />
            <Button onClick={handleCreate} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
