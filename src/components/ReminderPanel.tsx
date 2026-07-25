'use client';

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getReminders, createReminder, completeReminder, deleteReminder } from "@/actions/reminders";

interface Props { applicationId: string; }

export function ReminderPanel({ applicationId }: Props) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) getReminders().then(r => { if (r.success) setReminders(r.data ?? []); });
  }, [open]);

  const pending = reminders.filter(r => !r.isCompleted && r.applicationId === applicationId);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createReminder({ title: formData.get("title") as string, dueDate: formData.get("dueDate") as string, applicationId });
      if (result.success) { toast.success("Reminder created"); setReminders(prev => [...prev, result.data]); }
      else toast.error(result.error ?? "Failed");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="xs" className="gap-1 text-muted-foreground relative">
        <Bell className="h-3 w-3" /> Reminders
        {pending.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{pending.length}</span>}
      </Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Reminders</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {reminders.filter(r => r.applicationId === applicationId).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No reminders</p>}
          {reminders.filter(r => r.applicationId === applicationId).map(r => (
            <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg ${r.isCompleted ? "bg-muted/30 opacity-60" : "bg-muted/50"}`}>
              <div>
                <p className={`text-sm ${r.isCompleted ? "line-through" : ""}`}>{r.title}</p>
                <p className="text-xs text-muted-foreground">Due {formatDistanceToNow(new Date(r.dueDate), { addSuffix: true })}</p>
              </div>
              <div className="flex gap-1">
                {!r.isCompleted && <Button variant="ghost" size="icon-xs" onClick={() => { completeReminder(r.id); setReminders(prev => prev.map(x => x.id === r.id ? { ...x, isCompleted: true } : x)); }}><Check className="h-3 w-3 text-emerald-500" /></Button>}
                <Button variant="ghost" size="icon-xs" onClick={() => { deleteReminder(r.id); setReminders(prev => prev.filter(x => x.id !== r.id)); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
        <form action={handleCreate} className="space-y-3 border-t pt-4 mt-2">
          <div className="space-y-1"><Label className="text-xs">Reminder *</Label><Input name="title" placeholder="Follow up on interview" required className="h-8 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Due Date *</Label><Input name="dueDate" type="date" required className="h-8 text-sm" /></div>
          <Button type="submit" size="sm" disabled={isPending} className="w-full">{isPending ? "Creating..." : "Create Reminder"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
