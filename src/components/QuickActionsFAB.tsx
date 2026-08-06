'use client';

import { useState } from "react";
import { Briefcase, Calendar, Mail, Zap, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AddApplicationDialog } from "./AddApplicationDialog";
import { SchedulingAssistant } from "./SchedulingAssistant";
import { toast } from "sonner";

export function QuickActionsFAB() {
  const [open, setOpen] = useState(false);
  const [addAppOpen, setAddAppOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  

  async function handleSyncEmail() {
    
    setOpen(false);
    toast.info("Scanning inbox for new applications...");
    try {
      const response = await fetch("/api/cron/gmail-sync");
      if (response.ok) {
        toast.success("Inbox scan triggered in background.");
      } else {
        toast.error("Failed to sync Gmail");
      }
    } catch {
      toast.error("Failed to sync Gmail");
    }
    
  }

  const actions = [
    {
      label: "Add Application",
      icon: Briefcase,
      onClick: () => { setAddAppOpen(true); setOpen(false); },
      color: "bg-blue-500",
    },
    {
      label: "Schedule Interview",
      icon: Calendar,
      onClick: () => { setScheduleOpen(true); setOpen(false); },
      color: "bg-indigo-500",
    },
    {
      label: "Scan Inbox",
      icon: Mail,
      onClick: handleSyncEmail,
      color: "bg-emerald-500",
    },
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="flex flex-col gap-3"
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 justify-end"
                  >
                    <span className="bg-popover text-popover-foreground text-xs px-3 py-1.5 rounded-lg shadow-sm border font-medium">
                      {action.label}
                    </span>
                    <button
                      onClick={action.onClick}
                      className={`h-12 w-12 rounded-full ${action.color} text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setOpen(!open)}
          className={`h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform ${open ? 'rotate-45' : ''}`}
        >
          {open ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
        </button>
      </div>

      <AddApplicationDialog open={addAppOpen} onOpenChange={setAddAppOpen} />
      {/* For SchedulingAssistant, we pass an empty id, but typically it expects a candidate id.
          If there's no candidate ID, it should allow selecting a candidate.
          Let's assume the user will just use it or we will pass dummy data to start a new event */}
      <SchedulingAssistant open={scheduleOpen} onOpenChange={setScheduleOpen} candidateId="" candidateName="Candidate" candidateEmail="" positionApplied="" />
    </>
  );
}
