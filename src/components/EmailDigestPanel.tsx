'use client';

import { useState, useTransition, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Check, Loader2, Inbox, Plug, Unplug, RefreshCw, Archive, Undo2, Search, Filter, ArrowDownWideNarrow, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { scanInbox, classifyEmails, importEmailAsApplication, getGmailStatus, disconnectGmail, archiveEmail, undoImportEmail } from "@/actions/gmail";

interface ClassifiedEmail {
  message: { id: string; subject: string; from: string; body: string; date: string };
  classification: {
    isJobRelated: boolean;
    type: string;
    company?: string;
    role?: string;
    summary: string;
    suggestedStatus: string;
  };
}

export function EmailDigestPanel() {
  const [emails, setEmails] = useState<ClassifiedEmail[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [scannedOnce, setScannedOnce] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Search, Filter, Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "company">("date");

  useEffect(() => {
    getGmailStatus().then(r => {
      if (r.success && r.data) setGmailConnected(r.data.connected);
      setCheckingStatus(false);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");
    if (gmailParam === "connected") {
      toast.success("Gmail connected successfully!");
      setGmailConnected(true);
      window.history.replaceState({}, "", "/dashboard");
    } else if (gmailParam === "error") {
      const reason = params.get("reason");
      toast.error(reason ? `Gmail connection failed: ${reason}` : "Failed to connect Gmail");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  function handleConnectGmail() {
    window.location.href = "/api/auth/gmail/connect";
  }

  async function handleDisconnect() {
    const result = await disconnectGmail();
    if (result.success) {
      toast.success("Gmail disconnected");
      setGmailConnected(false);
      setEmails([]);
      setScannedOnce(false);
    } else {
      toast.error(result.error ?? "Failed to disconnect");
    }
  }

  async function handleScan() {
    setLoading(true);
    setScanError(null);
    try {
      const result = await scanInbox();
      if (!result.success || !result.data) {
        setScanError(result.error ?? "Failed to scan inbox");
        toast.error(result.error ?? "Failed to scan inbox");
        setLoading(false);
        return;
      }
      const classified = await classifyEmails(result.data);
      if (classified.success && classified.data) {
        const jobEmails = classified.data.filter(e => e.classification.isJobRelated);
        setEmails(jobEmails);
        setScannedOnce(true);
        toast.success(`Found ${jobEmails.length} job-related emails`);
      }
    } catch {
      setScanError("Failed to scan inbox");
      toast.error("Failed to scan inbox");
    }
    setLoading(false);
  }

  function handleImport(email: ClassifiedEmail) {
    startImport(async () => {
      const result = await importEmailAsApplication(email.message, email.classification);
      if (result.success) {
        toast.success("Imported successfully");
        setImportedIds(prev => new Set([...prev, email.message.id]));
      } else {
        toast.error(result.error ?? "Failed to import");
      }
    });
  }

  function handleUndoImport(emailId: string) {
    startImport(async () => {
      const result = await undoImportEmail(emailId);
      if (result.success) {
        toast.success("Import undone");
        setImportedIds(prev => {
          const next = new Set(prev);
          next.delete(emailId);
          return next;
        });
      } else {
        toast.error(result.error ?? "Failed to undo import");
      }
    });
  }

  function handleArchive(emailId: string) {
    startImport(async () => {
      const result = await archiveEmail(emailId);
      if (result.success) {
        toast.success("Archived in Gmail");
        setDismissedIds(prev => new Set([...prev, emailId]));
      } else {
        toast.error(result.error ?? "Failed to archive");
      }
    });
  }

  function handleImportAll() {
    const unimported = visibleEmails.filter(e => !importedIds.has(e.message.id));
    if (unimported.length === 0) {
      toast.info("No new emails to import in the current view.");
      return;
    }
    startImport(async () => {
      let successCount = 0;
      for (const email of unimported) {
        const result = await importEmailAsApplication(email.message, email.classification);
        if (result.success) {
          successCount++;
          setImportedIds(prev => new Set([...prev, email.message.id]));
        }
      }
      toast.success(`Imported ${successCount} out of ${unimported.length} emails`);
    });
  }

  let filtered = emails.filter(e => !dismissedIds.has(e.message.id));
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(e => 
      e.message.subject.toLowerCase().includes(q) || 
      e.classification.company?.toLowerCase().includes(q) ||
      e.message.from.toLowerCase().includes(q)
    );
  }
  if (statusFilter) {
    filtered = filtered.filter(e => e.classification.suggestedStatus === statusFilter);
  }
  const visibleEmails = [...filtered].sort((a, b) => {
    if (sortBy === "company") {
      return (a.classification.company || "").localeCompare(b.classification.company || "");
    }
    return new Date(b.message.date).getTime() - new Date(a.message.date).getTime();
  });

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Inbox className="h-5 w-5" /> Email Digest</h3>
        <div className="flex items-center gap-2">
          {!gmailConnected ? (
            <Button onClick={handleConnectGmail} size="sm" className="gap-2">
              <Plug className="h-4 w-4" /> Connect Gmail
            </Button>
          ) : (
            <>
              <Badge variant="outline" className="text-[11px] gap-1 py-1">
                <Mail className="h-3 w-3 text-emerald-500" />
                Gmail connected
              </Badge>
              <Button onClick={handleScan} disabled={loading} size="sm" className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {loading ? "Scanning..." : "Scan Inbox"}
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={handleDisconnect} title="Disconnect Gmail">
                <Unplug className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!gmailConnected && emails.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Connect Gmail to auto-import job applications from your inbox</p>
          <Button onClick={handleConnectGmail} variant="outline" size="sm" className="mt-4 gap-2">
            <Plug className="h-4 w-4" /> Connect Gmail
          </Button>
        </div>
      )}

      {scanError && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm text-destructive mb-2">{scanError}</p>
          <p className="text-xs">Make sure Gmail is connected and try again</p>
        </div>
      )}

      {scannedOnce && emails.length === 0 && !loading && !scanError && (
        <div className="text-center py-8 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No job-related emails found in your inbox</p>
        </div>
      )}

      {emails.length > 0 && (
        <div className="flex items-center justify-between gap-2 bg-muted/50 p-2 rounded-lg">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
            <Input 
              placeholder="Search emails..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 w-full max-w-[200px] bg-background border-none text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 text-xs px-3 gap-2">
                <Filter className="h-3.5 w-3.5" />
                {statusFilter || "All Statuses"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>All Statuses</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("INTERVIEW")}>Interview</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("REJECTED")}>Rejected</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("OFFER")}>Offer</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 text-xs px-3 gap-2">
                <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                Sort: {sortBy === "date" ? "Newest" : "Company"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => setSortBy("date")}>Date (Newest)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("company")}>Company (A-Z)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" onClick={handleImportAll} disabled={importing} className="h-8 text-xs">
              Import All Visible
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {visibleEmails.map((email, i) => (
            <motion.div 
              key={email.message.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95 }}
              transition={{ delay: i * 0.02, duration: 0.2 }}
            >
              <Card className={importedIds.has(email.message.id) ? "opacity-60 bg-muted/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{email.message.subject}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{email.message.from}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.classification.summary}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">{email.classification.type.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className="text-[10px]">{email.classification.suggestedStatus}</Badge>
                        {email.classification.company && <Badge variant="secondary" className="text-[10px]">{email.classification.company}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {!importedIds.has(email.message.id) ? (
                        <>
                          <Button size="sm" variant="default" onClick={() => handleImport(email)} disabled={importing} className="w-full text-xs h-7">
                            {importing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                            Import
                          </Button>
                          <div className="flex gap-1 w-full mt-1">
                            <Button size="icon-xs" variant="outline" className="flex-1 h-6" onClick={() => handleArchive(email.message.id)} title="Archive in Gmail">
                              <Archive className="h-3 w-3 text-muted-foreground hover:text-primary" />
                            </Button>
                            <Button size="icon-xs" variant="outline" className="flex-1 h-6" onClick={() => setDismissedIds(prev => new Set([...prev, email.message.id]))} title="Dismiss (hide)">
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 mb-1">Imported</Badge>
                          <Button size="icon-xs" variant="ghost" className="h-6 w-full text-[10px] gap-1" onClick={() => handleUndoImport(email.message.id)} title="Undo Import">
                            <Undo2 className="h-3 w-3" /> Undo
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {emails.length > 0 && visibleEmails.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No emails match your current filters.
          </div>
        )}
      </div>
    </div>
  );
}
