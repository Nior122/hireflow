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
import { suggestApplicationStatus } from "@/actions/copilot";
import { STATUS_LABELS, SOURCE_OPTIONS, type ApplicationStatus } from "@/lib/types";
import { LinkedInImport } from "./LinkedInImport";
import { Sparkles, Loader2 } from "lucide-react";

export function AddApplicationDialog({
  open: externalOpen,
  onOpenChange: setExternalOpen,
  trigger
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = setExternalOpen || setInternalOpen;
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ApplicationStatus>("UNAPPLIED");
  const [source, setSource] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  function handleLinkedInImport(c: string, r: string) { setCompany(c); setRole(r); setOpen(true); }

  async function handleSuggestStatus() {
    setIsSuggesting(true);
    setAiReasoning(null);
    try {
      const res = await suggestApplicationStatus(role, company, notes);
      if (res.success) {
        if (res.data) {
          setStatus(res.data.status as ApplicationStatus);
          setAiReasoning(res.data.reasoning);
          toast.success(`AI suggested: ${STATUS_LABELS[res.data.status as ApplicationStatus]}`);
        }
      } else {
        toast.error(res.error || "Failed to suggest status");
      }
    } catch (e) {
      toast.error("Error connecting to AI");
    } finally {
      setIsSuggesting(false);
    }
  }

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
      {trigger ? (
        <DialogTrigger render={trigger as any} />
      ) : externalOpen === undefined ? (
        <DialogTrigger render={<Button />}>
          <Plus className="mr-2 h-4 w-4" /> Add Application
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>Add Application</DialogTitle></DialogHeader>
          <div className="flex justify-end -mt-2"><LinkedInImport onImport={handleLinkedInImport} /></div>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Company</Label><Input name="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" required /></div>
          <div className="space-y-2"><Label>Role</Label><Input name="role" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Frontend Engineer" required /></div>
          <div className="space-y-2"><Label>Job URL</Label><Input name="link" type="url" placeholder="https://..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px] bg-primary/10 text-primary hover:bg-primary/20" onClick={handleSuggestStatus} disabled={isSuggesting}>
                  {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Suggest
                </Button>
              </div>
              <Select value={status} onValueChange={v => setStatus(v as ApplicationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.entries(STATUS_LABELS) as [ApplicationStatus, string][]).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Source</Label><Select value={source} onValueChange={v => setSource(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{SOURCE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." rows={3} /></div>
          {aiReasoning && (
            <div className="text-xs bg-muted p-2 rounded-md border border-primary/20 flex gap-2 items-start text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{aiReasoning}</span>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Adding..." : "Add Application"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
