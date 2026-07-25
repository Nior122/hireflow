'use client';

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, CheckCircle, Plug, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getAvailableSlots, createCalendarEvent, getCalendarStatus, disconnectCalendar } from "@/actions/calendar";
import { generateCandidateReply } from "@/actions/candidates";

interface TimeSlot {
  start: Date;
  end: Date;
}

interface Props {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  positionApplied: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchedulingAssistant({ candidateId, candidateName, candidateEmail, positionApplied, open, onOpenChange }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isPending, startTransition] = useTransition();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [eventCreated, setEventCreated] = useState(false);

  useEffect(() => {
    if (open) {
      getCalendarStatus().then(r => {
        if (r.success && r.data) setCalendarConnected(r.data.connected);
        setCheckingStatus(false);
      });
    }
  }, [open]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const calParam = params.get("calendar");
    if (calParam === "connected") {
      toast.success("Calendar connected!");
      setCalendarConnected(true);
      window.history.replaceState({}, "", "/dashboard");
    } else if (calParam === "error") {
      const reason = params.get("reason");
      toast.error(reason ? `Calendar connection failed: ${reason}` : "Failed to connect Calendar");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (calendarConnected && open && !checkingStatus) {
      setLoading(true);
      getAvailableSlots(5).then(r => {
        setSlots(r.success ? (r.data ?? []) : []);
        setLoading(false);
      });
    }
  }, [calendarConnected, open, checkingStatus]);

  function handleConnect() {
    window.location.href = "/api/auth/calendar/connect";
  }

  function handleDisconnect() {
    disconnectCalendar().then(r => {
      if (r.success) {
        toast.success("Calendar disconnected");
        setCalendarConnected(false);
        setSlots([]);
      }
    });
  }

  function handleSchedule() {
    if (!selectedSlot || !calendarConnected) return;

    startTransition(async () => {
      const summary = `Interview: ${positionApplied} - ${candidateName}`;
      const description = `Interview with ${candidateName} for ${positionApplied} position.\nCandidate email: ${candidateEmail}`;

      const result = await createCalendarEvent(
        summary,
        description,
        selectedSlot.start.toISOString(),
        selectedSlot.end.toISOString(),
        candidateEmail
      );

      if (result.success) {
        toast.success("Interview scheduled! Calendar invite sent to candidate.");
        setEventCreated(true);

        // Log activity
        const { logActivity } = await import("@/actions/activities");
        const { createOrGetUser } = await import("@/lib/clerk");
        const user = await createOrGetUser();
        logActivity(
          user.id,
          "INTERVIEW_SCHEDULED",
          `Interview scheduled with ${candidateName} for ${positionApplied} at ${format(selectedSlot.start, "MMM d, h:mm a")}`,
          undefined
        );
      } else {
        toast.error(result.error ?? "Failed to schedule interview");
      }
    });
  }

  if (checkingStatus) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setSelectedSlot(null); setEventCreated(false); } }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Interview - {candidateName}
          </DialogTitle>
        </DialogHeader>

        {!calendarConnected ? (
          <div className="text-center py-8 space-y-4">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">Connect Google Calendar to see available time slots and schedule interviews</p>
            <Button onClick={handleConnect} className="gap-2">
              <Plug className="h-4 w-4" /> Connect Calendar
            </Button>
          </div>
        ) : eventCreated ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500" />
            <div>
              <p className="text-lg font-semibold">Interview Scheduled!</p>
              {selectedSlot && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(selectedSlot.start, "EEEE, MMMM d at h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">Calendar invite has been sent to {candidateEmail}</p>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Available 1-hour slots (next 5 business days)</p>
              <Button variant="ghost" size="icon-xs" onClick={handleDisconnect} title="Disconnect calendar">
                <Unplug className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No available slots in the next 5 business days</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {slots.map((slot, i) => {
                  const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <p className="font-medium text-xs">{format(slot.start, "EEE, MMM d")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{format(slot.start, "h:mm a")} - {format(slot.end, "h:mm a")}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSlot && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">
                    {format(selectedSlot.start, "EEEE, MMMM d")} at {format(selectedSlot.start, "h:mm a")} - {format(selectedSlot.end, "h:mm a")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSchedule} disabled={isPending} className="gap-2" size="sm">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                    {isPending ? "Scheduling..." : "Schedule Interview"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSlot(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
