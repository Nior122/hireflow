'use client';

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
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
          toast.success(`Inbox synced! Processed ${result.data?.emailsProcessed ?? 0} emails, found ${result.data?.jobsDiscovered ?? 0} jobs.`);
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
    <Button variant="outline" size="sm" className="gap-2" onClick={handleSync} disabled={isSyncing}>
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? "Syncing..." : "Sync Gmail"}
    </Button>
  );
}
