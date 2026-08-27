'use client';

import { useState, useEffect, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Loader2, Inbox, Plug, Unplug, RefreshCw,
  Search, CheckCircle2, AlertCircle, Clock,
  Briefcase, UserCheck, XCircle, CalendarCheck, Gift,
  Star, Users, FileCheck, MessageSquare,
  Copy, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getGmailStatus, disconnectGmail, importEmailAsApplication } from "@/actions/gmail";
import { syncGmailInbox, getInboxEmails, getGmailSyncStatus, getInboxStats } from "@/actions/gmail-sync";
import { formatDistanceToNow } from "date-fns";

interface EmailRecord {
  id: string;
  gmailMessageId: string;
  sender: string | null;
  senderEmail: string | null;
  subject: string | null;
  snippet: string | null;
  body: string | null;
  receivedAt: Date | null;
  isRead: boolean;
  category: string | null;
  confidence: number | null;
  jobRelated: boolean;
  applicationRelated: boolean;
  interviewRelated: boolean;
  rejectionRelated: boolean;
  offerRelated: boolean;
  urgency: number | null;
  importance: number | null;
  action: string | null;
  replyDraft: string | null;
  createdAt: Date;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ALL: { label: "All Mail", icon: <Inbox className="h-4 w-4" />, color: "bg-gray-500/10 text-gray-600 border-gray-200" },
  JOB_OPPORTUNITY: { label: "Job Opportunities", icon: <Briefcase className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  APPLICATIONS: { label: "Applications", icon: <FileCheck className="h-4 w-4" />, color: "bg-cyan-500/10 text-cyan-600 border-cyan-200" },
  INTERVIEWS: { label: "Interviews", icon: <CalendarCheck className="h-4 w-4" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  OFFERS: { label: "Offers", icon: <Gift className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  REJECTIONS: { label: "Rejections", icon: <XCircle className="h-4 w-4" />, color: "bg-red-500/10 text-red-600 border-red-200" },
  RECRUITERS: { label: "Recruiters", icon: <UserCheck className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  NETWORKING: { label: "Networking", icon: <Users className="h-4 w-4" />, color: "bg-pink-500/10 text-pink-600 border-pink-200" },
  CAREER: { label: "Career", icon: <Star className="h-4 w-4" />, color: "bg-indigo-500/10 text-indigo-600 border-indigo-200" },
  IMPORTANT: { label: "Important", icon: <AlertCircle className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-600 border-orange-200" },
  OTHER: { label: "Other", icon: <Mail className="h-4 w-4" />, color: "bg-muted text-muted-foreground border-border" },
};

const SMART_FOLDERS = [
  "ALL", "JOB_OPPORTUNITY", "APPLICATIONS", "INTERVIEWS", "OFFERS",
  "REJECTIONS", "RECRUITERS", "NETWORKING", "CAREER", "IMPORTANT", "OTHER",
];

function getCategoryMeta(category: string | null) {
  if (!category) return CATEGORY_META.OTHER;
  return CATEGORY_META[category] ?? CATEGORY_META.OTHER;
}

export function EmailDigestPanel() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [totalEmails, setTotalEmails] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [syncing, startSync] = useTransition();
  const [importing, startImport] = useTransition();
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncedAt: Date | null;
    emailCount: number;
    jobsDiscovered: number;
  } | null>(null);

  const [folderStats, setFolderStats] = useState<Record<string, number>>({});
  const [activeFolder, setActiveFolder] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Handle OAuth redirect query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");
    if (gmailParam === "connected") {
      toast.success("Gmail connected! Syncing your inbox...");
      setGmailConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
      handleSync();
    } else if (gmailParam === "error") {
      const reason = params.get("reason");
      toast.error(reason ? `Gmail connection failed: ${reason.replace(/_/g, " ")}` : "Failed to connect Gmail");
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatusAndStats = useCallback(async () => {
    const [statusRes, gmailRes, statsRes] = await Promise.all([
      getGmailSyncStatus(),
      getGmailStatus(),
      getInboxStats(),
    ]);
    if (gmailRes.success && gmailRes.data) setGmailConnected(gmailRes.data.connected);
    if (statusRes.success && statusRes.data) setSyncStatus(statusRes.data);
    if (statsRes.success && statsRes.data) setFolderStats(statsRes.data);
    setInitializing(false);
  }, []);

  const loadEmails = useCallback(async (currentPage = 1, folder = "ALL") => {
    setLoading(true);
    const res = await getInboxEmails({
      category: folder,
      page: currentPage,
      pageSize: 25,
    });
    if (res.success && res.data) {
      if (currentPage === 1) {
        setEmails(res.data.emails as EmailRecord[]);
      } else {
        setEmails(prev => [...prev, ...(res.data!.emails as EmailRecord[])]);
      }
      setTotalEmails(res.data.total);
      setHasMore(res.data.hasMore);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatusAndStats();
  }, [loadStatusAndStats]);

  useEffect(() => {
    if (!initializing && gmailConnected) {
      loadEmails(1, activeFolder);
      setPage(1);
    }
  }, [initializing, gmailConnected, activeFolder, loadEmails]);

  function handleSync() {
    startSync(async () => {
      const res = await syncGmailInbox();
      if (res.success && res.data) {
        toast.success(`Synced ${res.data.emailsProcessed} emails.`);
        await loadStatusAndStats();
        await loadEmails(1, activeFolder);
        setPage(1);
      } else if (!res.success) {
        toast.error(res.error ?? "Failed to sync inbox");
      }
    });
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadEmails(nextPage, activeFolder);
  }

  async function handleDisconnect() {
    const res = await disconnectGmail();
    if (res.success) {
      toast.success("Gmail disconnected");
      setGmailConnected(false);
      setEmails([]);
      setSyncStatus(null);
      setFolderStats({});
    } else {
      toast.error(res.error ?? "Failed to disconnect");
    }
  }

  function handleImport(email: EmailRecord) {
    startImport(async () => {
      const mockMsg = {
        id: email.gmailMessageId,
        subject: email.subject ?? "",
        from: email.sender ?? email.senderEmail ?? "",
        body: email.snippet ?? "",
        date: email.receivedAt?.toISOString() ?? "",
      };
      const mockClass = {
        isJobRelated: email.jobRelated,
        type: email.category ?? "other",
        summary: email.snippet ?? "",
        suggestedStatus: email.applicationRelated ? "APPLIED" : email.interviewRelated ? "INTERVIEW" : email.offerRelated ? "OFFER" : email.rejectionRelated ? "REJECTED" : "APPLIED",
        company: email.sender ?? undefined,
        role: email.subject?.replace(/^re:\s*/i, "") ?? undefined,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await importEmailAsApplication(mockMsg as any, mockClass as any);
      if (res.success) {
        toast.success("Added to Applications");
        setImportedIds(prev => new Set([...prev, email.id]));
      } else {
        toast.error(res.error ?? "Failed to import");
      }
    });
  }

  function handleDismiss(emailId: string) {
    setDismissedIds(prev => new Set([...prev, emailId]));
    toast.success("Email dismissed");
  }

  // Client-side search filter
  const visible = emails.filter(e => {
    if (dismissedIds.has(e.id)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.subject?.toLowerCase().includes(q) ||
      e.sender?.toLowerCase().includes(q) ||
      e.senderEmail?.toLowerCase().includes(q) ||
      e.snippet?.toLowerCase().includes(q)
    );
  });

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not connected state
  if (!gmailConnected) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-xl space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-lg">Connect Gmail for Smart Folders</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            HireFlow ingests your inbox and automatically categorizes your emails into Smart Folders like Job Opportunities, Applications, and Offers.
          </p>
        </div>
        <Button onClick={() => { window.location.href = "/api/auth/gmail/connect"; }} className="gap-2">
          <Plug className="h-4 w-4" /> Connect Gmail
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-background flex flex-col md:flex-row overflow-hidden shadow-sm" style={{ minHeight: "700px" }}>
      {/* ───── Sidebar: Smart Folders ───── */}
      <div className="w-full md:w-60 border-b md:border-b-0 md:border-r bg-muted/30 flex flex-col shrink-0">
        <div className="p-4 border-b bg-background/50 backdrop-blur-sm flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Inbox className="h-4 w-4" /> Smart Folders
          </h3>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} title="Disconnect Gmail" className="h-6 w-6 p-0">
            <Unplug className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-0.5">
            {SMART_FOLDERS.map((folder) => {
              const meta = getCategoryMeta(folder);
              const count = folderStats[folder] || 0;
              const isActive = activeFolder === folder;

              return (
                <button
                  key={folder}
                  onClick={() => { setActiveFolder(folder); setExpandedEmail(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"}>
                      {meta.icon}
                    </span>
                    <span className="font-medium text-[13px]">{meta.label}</span>
                  </div>
                  {count > 0 && (
                    <span className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sync controls */}
        <div className="p-3 border-t bg-background/50 backdrop-blur-sm space-y-2">
          <Button onClick={handleSync} disabled={syncing} size="sm" className="w-full gap-2" variant="outline">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? "Syncing..." : "Sync Inbox"}
          </Button>
          <Button onClick={() => { window.location.href = "/api/auth/gmail/connect"; }} size="sm" variant="secondary" className="w-full gap-2">
            <Mail className="h-4 w-4" /> Reconnect
          </Button>
          <div className="text-[10px] text-center text-muted-foreground">
            {syncStatus?.lastSyncedAt
              ? `Last synced ${formatDistanceToNow(new Date(syncStatus.lastSyncedAt), { addSuffix: true })}`
              : "Never synced"}
          </div>
        </div>
      </div>

      {/* ───── Main Content Pane ───── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-background z-10">
          <h2 className="font-semibold text-base flex items-center gap-2">
            {getCategoryMeta(activeFolder).icon}
            {getCategoryMeta(activeFolder).label}
            {totalEmails > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1">{totalEmails}</Badge>
            )}
          </h2>
          <div className="relative w-56 hidden sm:block">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/50"
            />
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
          <div className="max-w-3xl mx-auto space-y-2 pb-8">
            <AnimatePresence mode="popLayout">
              {/* Empty state */}
              {visible.length === 0 && !loading && !syncing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-background mt-4"
                >
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium text-foreground">
                    {activeFolder === "ALL" && folderStats.ALL === 0
                      ? "No emails synced yet"
                      : `No ${getCategoryMeta(activeFolder).label.toLowerCase()} found`}
                  </p>
                  <p className="text-sm mt-1 max-w-sm mx-auto">
                    {activeFolder !== "ALL" && folderStats.ALL > 0 && (
                      <>We scanned <strong className="text-foreground">{folderStats.ALL}</strong> recent emails but found none in this category.</>
                    )}
                    {activeFolder === "ALL" && folderStats.ALL === 0 && (
                      <>Click &quot;Sync Inbox&quot; to fetch your recent emails.</>
                    )}
                  </p>
                  {searchQuery && (
                    <Button variant="link" onClick={() => setSearchQuery("")} className="mt-4">Clear search</Button>
                  )}
                </motion.div>
              )}

              {/* Email cards */}
              {visible.map((email) => {
                const meta = getCategoryMeta(email.category);
                const isImported = importedIds.has(email.id);
                const isExpanded = expandedEmail === email.id;

                return (
                  <motion.div
                    key={email.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className={`overflow-hidden transition-all duration-200 cursor-pointer hover:border-primary/40 ${
                        isExpanded ? "ring-1 ring-primary shadow-md" : "shadow-sm"
                      } ${isImported ? "opacity-60" : ""} ${!email.isRead ? "border-l-4 border-l-primary" : ""}`}
                      onClick={() => setExpandedEmail(isExpanded ? null : email.id)}
                    >
                      <CardContent className="p-0">
                        {/* Summary Row */}
                        <div className="p-4 flex items-start gap-3">
                          {/* Urgency dot */}
                          <div className="mt-1.5 shrink-0">
                            <span className={`block h-2.5 w-2.5 rounded-full ${
                              (email.urgency ?? 0) > 0.7 ? "bg-red-500 shadow-sm shadow-red-500/50" :
                              (email.urgency ?? 0) > 0.4 ? "bg-orange-400" :
                              (email.importance ?? 0) > 0.5 ? "bg-yellow-400" : "bg-gray-300"
                            }`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-sm truncate max-w-[200px]">
                                {email.sender || email.senderEmail || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {email.receivedAt ? formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true }) : ""}
                              </span>
                              {activeFolder === "ALL" && email.category && email.category !== "OTHER" && (
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ml-auto ${meta.color}`}>
                                  {meta.icon} {meta.label}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium text-[14px] truncate mb-1">
                              {email.subject || "(No Subject)"}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{email.snippet}</p>
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 flex items-center gap-1">
                            {!isImported && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); handleDismiss(email.id); }}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                title="Dismiss"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {(email.jobRelated || email.applicationRelated || email.interviewRelated || email.offerRelated) && (
                              isImported ? (
                                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                  <CheckCircle2 className="h-3 w-3 mr-0.5" /> Added
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); handleImport(email); }}
                                  disabled={importing}
                                  className="h-7 text-xs gap-1"
                                >
                                  <Briefcase className="h-3 w-3" /> Add
                                </Button>
                              )
                            )}
                          </div>
                        </div>

                        {/* Expanded Detail View */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t bg-muted/10 overflow-hidden"
                            >
                              <div className="p-4 space-y-4">
                                {/* AI Insights bar */}
                                {email.confidence != null && email.confidence > 0.3 && (
                                  <div className="flex gap-4 p-3 rounded-lg bg-primary/5 border border-primary/10 flex-wrap">
                                    <div className="flex-1 space-y-1 min-w-[200px]">
                                      <h5 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                                        <Star className="h-3 w-3" /> AI Insights
                                      </h5>
                                      <div className="flex gap-4 text-xs flex-wrap">
                                        <span><span className="text-muted-foreground">Category:</span> {getCategoryMeta(email.category).label}</span>
                                        <span><span className="text-muted-foreground">Confidence:</span> {Math.round(email.confidence * 100)}%</span>
                                        {email.action && <span><span className="text-muted-foreground">Action:</span> {email.action}</span>}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Reply Draft */}
                                {email.replyDraft && (
                                  <div className="p-3 rounded-lg bg-muted/50 border">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" /> Suggested Reply
                                      </h5>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(email.replyDraft!); toast.success("Copied!"); }}
                                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-medium"
                                      >
                                        <Copy className="h-3 w-3" /> Copy
                                      </button>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{email.replyDraft}</p>
                                  </div>
                                )}

                                {/* Email Body */}
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message Body</h5>
                                  <div className="text-sm bg-background border rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                                    {email.body || email.snippet || "No body content available."}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Load More */}
            {hasMore && !searchQuery && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={handleLoadMore} disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Load More ({totalEmails - emails.length} remaining)
                </Button>
              </div>
            )}

            {/* Syncing indicator */}
            {syncing && (
              <div className="flex justify-center p-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full text-sm text-muted-foreground shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning your Gmail inbox...
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
