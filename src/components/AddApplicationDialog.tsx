'use client';

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createApplication } from "@/actions/applications";
import { STATUS_LABELS, SOURCE_OPTIONS, type ApplicationStatus } from "@/lib/types";
import { LinkedInImport } from "./LinkedInImport";

export function AddApplicationDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ApplicationStatus>("UNAPPLIED");
  const [source, setSource] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  function handleLinkedInImport(c: string, r: string) { setCompany(c); setRole(r); setOpen(true); }

  async function handleSubmit(formData: FormData) {
    formData.set("status", status);
    formData.set("source", source);
    startTransition(async () => {
      const result = await createApplication(formData);
      if (result.success) { toast.success("Application added"); setOpen(false); }
      else toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" /> Add Application
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Add Application</DialogTitle></DialogHeader>
          <div className="flex justify-end -mt-2"><LinkedInImport onImport={handleLinkedInImport} /></div>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Company</Label><Input name="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" required /></div>
          <div className="space-y-2"><Label>Role</Label><Input name="role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" required /></div>
          <div className="space-y-2"><Label>Job URL</Label><Input name="link" type="url" placeholder="https://..." /></div>
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
          <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" placeholder="Any notes..." rows={3} /></div>
          <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Adding..." : "Add Application"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
