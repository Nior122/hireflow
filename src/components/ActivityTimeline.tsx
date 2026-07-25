'use client';

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { ArrowRight, Pencil, Bell, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getActivities } from "@/actions/activities";
import type { ActivityLog } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  STATUS_CHANGED: <ArrowRight className="h-4 w-4" />,
  NOTE_UPDATED: <Pencil className="h-4 w-4" />,
  REMINDER_CREATED: <Bell className="h-4 w-4" />,
  REMINDER_COMPLETED: <CheckCircle className="h-4 w-4" />,
};

const COLORS: Record<string, string> = {
  STATUS_CHANGED: "bg-blue-500",
  NOTE_UPDATED: "bg-amber-500",
  REMINDER_CREATED: "bg-cyan-500",
  REMINDER_COMPLETED: "bg-emerald-500",
};

interface Props { applicationId: string; applicationCompany: string; }

export function ActivityTimeline({ applicationId, applicationCompany }: Props) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) getActivities(applicationId).then(r => { if (r.success) setActivities(r.data); });
  }, [open, applicationId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="xs" className="gap-1 text-muted-foreground w-full justify-center">
        <Clock className="h-3 w-3" /> History
      </Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Activity - {applicationCompany}</DialogTitle></DialogHeader>
        <div className="relative max-h-96 overflow-y-auto">
          {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>}
          <div className="relative ml-4">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
            {activities.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative flex items-start gap-3 pb-5">
                <div className={`absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full ${COLORS[a.action] ?? "bg-gray-400"} flex items-center justify-center text-white`}>
                  {ICONS[a.action] ?? <Clock className="h-3 w-3" />}
                </div>
                <div className="ml-4">
                  <p className="text-sm">{a.detail ?? a.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
