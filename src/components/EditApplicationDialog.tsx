'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateApplication } from "@/actions/applications";
import { STATUS_LABELS, SOURCE_OPTIONS, type ApplicationCard, type ApplicationStatus } from "@/lib/types";

interface Props { application: ApplicationCard; open: boolean; onOpenChange: (open: boolean) => void; }

export function EditApplicationDialog({ application, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [source, setSource] = useState(application.source ?? "");

  async function handleSubmit(formData: FormData) {
    formData.set("status", status);
    formData.set("source", source);
    startTransition(async () => {
      const result = await updateApplication(application.id, formData);
      if (result.success) { toast.success("Application updated"); onOpenChange(false); }
      else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Edit Application</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Company</Label><Input name="company" defaultValue={application.company} required /></div>
          <div className="space-y-2"><Label>Role</Label><Input name="role" defaultValue={application.role} required /></div>
          <div className="space-y-2"><Label>Job URL</Label><Input name="link" type="url" defaultValue={application.link ?? ""} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={v => setStatus(v as ApplicationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.entries(STATUS_LABELS) as [ApplicationStatus, string][]).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
            <div className="space-y-2"><Label>Source</Label><Select value={source} onValueChange={v => setSource(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" defaultValue={application.notes ?? ""} rows={3} /></div>
          <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
