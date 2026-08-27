'use client';

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncGmailInbox } from "@/actions/gmail-sync";
import { useRouter } from "next/navigation";

export function GlobalSyncButton() {
  const [isSyncing, startSync] = useTransition();
  const router = useRouter();

  function handleSync() {
    startSync(async () => {
      try {
        const result = await syncGmailInbox();
        if (result.success) {
          const d = result.data;
          toast.success(`Synced! Processed ${d?.emailsProcessed ?? 0} emails. Discovered ${d?.applicationsDiscovered ?? 0} apps, ${d?.interviewsDiscovered ?? 0} interviews & ${d?.jobsDiscovered ?? 0} jobs.`);
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to sync Gmail. Please connect in Settings.");
        }
      } catch (err) {
        toast.error("Network error while syncing Gmail. Please try again.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={isSyncing}>
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? "Syncing..." : "Sync Gmail"}
      </Button>
      <Button 
        variant="secondary" 
        size="sm" 
        className="gap-2" 
        onClick={() => { window.location.href = "/api/auth/gmail/connect"; }} 
        title="Start sync afresh and choose a new Gmail account"
      >
        <Mail className="h-4 w-4" /> Reconnect
      </Button>
    </div>
  );
}
