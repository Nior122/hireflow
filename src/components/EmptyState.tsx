'use client';

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, ClipboardCheck, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddApplicationDialog } from "./AddApplicationDialog";
import { syncGmailInbox } from "@/actions/gmail-sync";
import Link from "next/link";

export function EmptyState() {
  const router = useRouter();
  const [isSyncing, startSync] = useTransition();

  function handleScanGmail() {
    startSync(async () => {
      try {
        const result = await syncGmailInbox();
        if (result.success) {
          const d = result.data;
          toast.success(
            `Inbox synced! Processed ${d?.emailsProcessed ?? 0} emails. Discovered ${d?.applicationsDiscovered ?? 0} applications, ${d?.interviewsDiscovered ?? 0} interviews, and ${d?.jobsDiscovered ?? 0} opportunities.`
          );
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to scan Gmail. Please check your connection in Settings.");
        }
      } catch (error) {
        console.error("Gmail sync failed:", error);
        toast.error("Network or server error while scanning Gmail. Please try again.");
      }
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center py-24 px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: "spring" }} className="mb-8 relative">
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center ring-1 ring-primary/10">
          <ClipboardCheck className="h-14 w-14 text-primary/60" />
        </div>
        <motion.div className="absolute -top-2 -right-2" animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
          <Sparkles className="h-6 w-6 text-amber-500" />
        </motion.div>
      </motion.div>

      <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-2xl font-bold tracking-tight mb-3">No applications yet</motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="text-muted-foreground text-center max-w-md mb-10 leading-relaxed">
        Let&apos;s build your AI career pipeline. Connect your inbox or add your first job manually.
      </motion.p>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="flex flex-col sm:flex-row items-center gap-3">
        <Button size="lg" className="gap-2" onClick={handleScanGmail} disabled={isSyncing}>
          <Mail className="h-4 w-4" />
          {isSyncing ? "Scanning..." : "Scan Gmail for Jobs"}
        </Button>
        <AddApplicationDialog />
        <Link href="/dashboard/discover">
          <Button size="lg" variant="outline" className="gap-2">
            <Search className="h-4 w-4" />
            Discover Jobs
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
}
