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
import { suggestApplicationStatus } from "@/actions/copilot";
import { STATUS_LABELS, SOURCE_OPTIONS, type ApplicationCard, type ApplicationStatus } from "@/lib/types";
import { Sparkles, Loader2 } from "lucide-react";

interface Props { application: ApplicationCard; open: boolean; onOpenChange: (open: boolean) => void; }

export function EditApplicationDialog({ application, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const [company, setCompany] = useState(application.company);
  const [role, setRole] = useState(application.role);
  const [notes, setNotes] = useState(application.notes ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(application.status);
  const [source, setSource] = useState(application.source ?? "");

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
    } catch (_e) {
      toast.error("Error connecting to AI");
    } finally {
      setIsSuggesting(false);
    }
  }

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
          <div className="space-y-2"><Label>Company</Label><Input name="company" value={company} onChange={e => setCompany(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Role</Label><Input name="role" value={role} onChange={e => setRole(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Job URL</Label><Input name="link" type="url" defaultValue={application.link ?? ""} /></div>
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
          <div className="space-y-2"><Label>Notes</Label><Textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} /></div>
          {aiReasoning && (
            <div className="text-xs bg-muted p-2 rounded-md border border-primary/20 flex gap-2 items-start text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{aiReasoning}</span>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
