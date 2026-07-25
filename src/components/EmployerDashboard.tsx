'use client';

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Users, Inbox, UserCog } from "lucide-react";
import { EmailTemplateEditor } from "./EmailTemplateEditor";
import { ExportButton } from "./ExportButton";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCandidates } from "@/actions/candidates";
import type { CandidateCard } from "@/lib/types";

const CandidatePipeline = dynamic(() => import("./CandidatePipeline").then(m => ({ default: m.CandidatePipeline })), { loading: () => <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">{Array.from({length:6}).map((_,i)=><div key={i} className="h-48 bg-muted rounded-xl animate-pulse"/>)}</div> });
const EmailDigestPanel = dynamic(() => import("./EmailDigestPanel").then(m => ({ default: m.EmailDigestPanel })), { loading: () => <Skeleton className="h-32 rounded-xl" /> });
const TeamDashboard = dynamic(() => import("./TeamDashboard").then(m => ({ default: m.TeamDashboard })), { loading: () => <Skeleton className="h-64 rounded-xl" /> });

interface Props { userId: string; }

export function EmployerDashboard({ userId }: Props) {
  const [candidates, setCandidates] = useState<CandidateCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDigest, setShowDigest] = useState(false);
  const [tab, setTab] = useState<"pipeline" | "team">("pipeline");

  useEffect(() => {
    getCandidates().then(r => {
      setCandidates(r.success ? r.data : []);
      setLoading(false);
    });
  }, []);

  function refreshCandidates() {
    getCandidates().then(r => {
      setCandidates(r.success ? r.data : []);
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const cands = candidates ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Employer Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage candidates through your hiring pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            <Button variant={tab === "pipeline" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setTab("pipeline")}>Pipeline</Button>
            <Button variant={tab === "team" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setTab("team")}><UserCog className="h-3 w-3" /> Team</Button>
          </div>
          {tab === "pipeline" && (
            <>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowDigest(!showDigest)}>
                <Inbox className="h-4 w-4" /> Email Digest
              </Button>
              <EmailTemplateEditor />
              <AddCandidateDialog onCandidateCreated={refreshCandidates} />
              <ExportButton />
            </>
          )}
        </div>
      </div>

      {tab === "team" ? (
        <TeamDashboard />
      ) : (
        <>
          {showDigest && (
            <div className="mb-8 p-4 rounded-xl border bg-card">
              <EmailDigestPanel />
            </div>
          )}
          <CandidatePipeline initialCandidates={cands} />
        </>
      )}
    </motion.div>
  );
}
