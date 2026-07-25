'use client';

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Check, Loader2, Inbox, Plug, Unplug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scanInbox, classifyEmails, importEmailAsApplication, getGmailStatus, disconnectGmail } from "@/actions/gmail";

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
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [importing, startImport] = useTransition();
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [scannedOnce, setScannedOnce] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    // Check Gmail connection status
    getGmailStatus().then(r => {
      if (r.success && r.data) setGmailConnected(r.data.connected);
      setCheckingStatus(false);
    });
  }, []);

  useEffect(() => {
    // Handle OAuth callback results via URL params
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

      <div className="space-y-3">
        {emails.map((email, i) => (
          <motion.div key={email.message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={importedIds.has(email.message.id) ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{email.message.subject}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{email.message.from}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{email.classification.summary}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">{email.classification.type}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{email.classification.suggestedStatus}</Badge>
                      {email.classification.company && <Badge variant="secondary" className="text-[10px]">{email.classification.company}</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!importedIds.has(email.message.id) ? (
                      <Button size="icon-xs" onClick={() => handleImport(email)} disabled={importing}>
                        {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                    ) : (
                      <Badge className="text-[10px]">Imported</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
