'use client';

import { useState, useEffect, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Loader2, Inbox, Plug, Unplug, RefreshCw,
  Search, Filter, CheckCircle2, AlertCircle, Clock,
  Briefcase, UserCheck, XCircle, CalendarCheck, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getGmailStatus, disconnectGmail } from "@/actions/gmail";
import { syncGmailInbox, getInboxEmails, getGmailSyncStatus } from "@/actions/gmail-sync";
import { importEmailAsApplication } from "@/actions/gmail";
import { formatDistanceToNow } from "date-fns";

interface EmailRecord {
  id: string;
  gmailMessageId: string;
  sender: string | null;
  senderEmail: string | null;
  subject: string | null;
  snippet: string | null;
  receivedAt: Date | null;
  isRead: boolean;
  category: string | null;
  confidence: number | null;
  jobRelated: boolean;
  applicationRelated: boolean;
  interviewRelated: boolean;
  rejectionRelated: boolean;
  offerRelated: boolean;
  createdAt: Date;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  JOB_OPPORTUNITY: { label: "Job Opportunity", icon: <Briefcase className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  RECRUITER: { label: "Recruiter", icon: <UserCheck className="h-3 w-3" />, color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  INTERVIEW: { label: "Interview", icon: <CalendarCheck className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  INTERVIEW_REMINDER: { label: "Interview Reminder", icon: <CalendarCheck className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  REJECTION: { label: "Rejection", icon: <XCircle className="h-3 w-3" />, color: "bg-red-500/10 text-red-600 border-red-200" },
  OFFER: { label: "Offer", icon: <Gift className="h-3 w-3" />, color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  APPLICATION_CONFIRMATION: { label: "Application Confirmed", icon: <CheckCircle2 className="h-3 w-3" />, color: "bg-teal-500/10 text-teal-600 border-teal-200" },
  FOLLOW_UP: { label: "Follow Up", icon: <Mail className="h-3 w-3" />, color: "bg-sky-500/10 text-sky-600 border-sky-200" },
  OTHER: { label: "Other", icon: <Mail className="h-3 w-3" />, color: "bg-muted text-muted-foreground border-border" },
};

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

  const [gmailConnected, setGmailConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncedAt: Date | null;
    emailCount: number;
    jobsDiscovered: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Handle OAuth redirect query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");
    if (gmailParam === "connected") {
      toast.success("Gmail connected! Syncing your inbox...");
      setGmailConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-sync after connect
      handleSync();
    } else if (gmailParam === "error") {
      const reason = params.get("reason");
      toast.error(reason ? `Gmail connection failed: ${reason.replace(/_/g, " ")}` : "Failed to connect Gmail");
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = useCallback(async () => {
    const [statusRes, gmailRes] = await Promise.all([
      getGmailSyncStatus(),
      getGmailStatus(),
    ]);
    if (gmailRes.success && gmailRes.data) setGmailConnected(gmailRes.data.connected);
    if (statusRes.success && statusRes.data) setSyncStatus(statusRes.data);
    setInitializing(false);
  }, []);

  const loadEmails = useCallback(async (currentPage = 1, filter: string | null = null) => {
    setLoading(true);
    const res = await getInboxEmails({
      category: filter ?? undefined,
      page: currentPage,
      pageSize: 20,
      jobRelatedOnly: !filter,
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
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!initializing && gmailConnected) {
      loadEmails(1, categoryFilter);
      setPage(1);
    }
  }, [initializing, gmailConnected, categoryFilter, loadEmails]);

  function handleSync() {
    startSync(async () => {
      const res = await syncGmailInbox();
      if (res.success && res.data) {
        toast.success(
          `Synced ${res.data.emailsProcessed} emails${res.data.jobsDiscovered > 0 ? `, found ${res.data.jobsDiscovered} new job${res.data.jobsDiscovered !== 1 ? "s" : ""}` : ""}`
        );
        await loadStatus();
        await loadEmails(1, categoryFilter);
        setPage(1);
      } else if (!res.success) {
        toast.error(res.error ?? "Failed to sync inbox");
      }
    });
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadEmails(nextPage, categoryFilter);
  }

  async function handleDisconnect() {
    const res = await disconnectGmail();
    if (res.success) {
      toast.success("Gmail disconnected");
      setGmailConnected(false);
      setEmails([]);
      setSyncStatus(null);
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
      const res = await importEmailAsApplication(mockMsg, mockClass);
      if (res.success) {
        toast.success("Added to Applications");
        setImportedIds(prev => new Set([...prev, email.id]));
      } else {
        toast.error(res.error ?? "Failed to import");
      }
    });
  }

  // Client-side search filter
  const visible = emails.filter(e => {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Email Intelligence
          </h3>
          {syncStatus && (
            <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
              <Clock className="h-2.5 w-2.5" />
              {syncStatus.lastSyncedAt
                ? `Synced ${formatDistanceToNow(new Date(syncStatus.lastSyncedAt), { addSuffix: true })}`
                : "Never synced"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!gmailConnected ? (
            <Button onClick={() => { window.location.href = "/api/auth/gmail/connect"; }} size="sm" className="gap-2">
              <Plug className="h-4 w-4" /> Connect Gmail
            </Button>
          ) : (
            <>
              <Badge variant="outline" className="text-[11px] gap-1 py-1 text-emerald-600 border-emerald-200">
                <Mail className="h-3 w-3" /> Gmail connected
              </Badge>
              {syncStatus && (
                <span className="text-xs text-muted-foreground">
                  {syncStatus.emailCount} emails · {syncStatus.jobsDiscovered} jobs found
                </span>
              )}
              <Button onClick={handleSync} disabled={syncing} size="sm" className="gap-2">
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {syncing ? "Syncing..." : "Sync Inbox"}
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={handleDisconnect} title="Disconnect Gmail">
                <Unplug className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Not connected empty state */}
      {!gmailConnected && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Connect Gmail to let HireFlow understand your job search</p>
            <p className="text-sm text-muted-foreground mt-1">
              HireFlow will scan your inbox and automatically discover job opportunities, interviews, offers, and rejections.
            </p>
          </div>
          <Button onClick={() => { window.location.href = "/api/auth/gmail/connect"; }} className="gap-2">
            <Plug className="h-4 w-4" /> Connect Gmail
          </Button>
        </div>
      )}

      {/* Connected but no emails yet */}
      {gmailConnected && !loading && emails.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-xl space-y-3">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <div>
            <p className="font-medium text-sm">No relevant emails found yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {syncStatus?.lastSyncedAt
                ? "No job-related emails were found in your recent inbox. Try syncing again or check back later."
                : "Click \"Sync Inbox\" to scan your Gmail for job opportunities, interviews, and offers."}
            </p>
          </div>
          {!syncStatus?.lastSyncedAt && (
            <Button onClick={handleSync} disabled={syncing} size="sm" className="gap-2">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync Now
            </Button>
          )}
        </div>
      )}

      {/* Filters + Search */}
      {gmailConnected && emails.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 h-8 text-xs font-medium hover:bg-accent">
              <Filter className="h-3.5 w-3.5" />
              {categoryFilter ? (getCategoryMeta(categoryFilter).label) : "All Categories"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => setCategoryFilter(null)}>All Categories</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("JOB_OPPORTUNITY")}>Job Opportunity</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("RECRUITER")}>Recruiter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("INTERVIEW")}>Interview</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("REJECTION")}>Rejection</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("OFFER")}>Offer</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("APPLICATION_CONFIRMATION")}>Application Confirmed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Email List */}
      <div className="space-y-2">
        <AnimatePresence>
          {visible.map((email, i) => {
            const meta = getCategoryMeta(email.category);
            const isImported = importedIds.has(email.id);

            return (
              <motion.div
                key={email.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.97 }}
                transition={{ delay: i * 0.015, duration: 0.2 }}
              >
                <Card className={`transition-opacity ${isImported ? "opacity-50" : ""} ${!email.isRead ? "border-primary/30" : ""}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${meta.color}`}>
                            {meta.icon} {meta.label}
                          </span>
                          {!email.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" title="Unread" />
                          )}
                        </div>
                        <h4 className="font-medium text-sm mt-1 truncate">{email.subject || "(No Subject)"}</h4>
                        <p className="text-xs text-muted-foreground">
                          {email.sender || email.senderEmail || "Unknown sender"}
                          {email.receivedAt && (
                            <span className="ml-2 opacity-60">
                              · {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                            </span>
                          )}
                        </p>
                        {email.snippet && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 opacity-80">{email.snippet}</p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {email.applicationRelated || email.jobRelated || email.interviewRelated || email.offerRelated ? (
                          isImported ? (
                            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" /> Added
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImport(email)}
                              disabled={importing}
                              className="h-7 text-xs gap-1"
                            >
                              {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Briefcase className="h-3 w-3" />}
                              Add to Apps
                            </Button>
                          )
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Load More */}
        {hasMore && !searchQuery && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Load More ({totalEmails - emails.length} remaining)
            </Button>
          </div>
        )}

        {/* Search empty state */}
        {visible.length === 0 && emails.length > 0 && searchQuery && (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No emails match your search.</p>
          </div>
        )}

        {/* Syncing indicator */}
        {syncing && (
          <div className="text-center py-4 text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Scanning your Gmail inbox for job-related emails...
          </div>
        )}
      </div>
    </div>
  );
}
