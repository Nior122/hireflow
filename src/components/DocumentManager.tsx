'use client';

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { FileText, Upload, Paperclip, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { uploadApplicationDocument, getApplicationDocuments, downloadApplicationDocument, deleteApplicationDocument, updateApplication } from "@/actions/applications";
import type { ApplicationCard } from "@/lib/types";

interface Props {
  application: ApplicationCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentManager({ application, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [resumeName, setResumeName] = useState(application.resumeFileName ?? "");
  const [coverLetterName, setCoverLetterName] = useState(application.coverLetterFileName ?? "");

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateApplication(application.id, formData);
      if (result.success) {
        toast.success("Documents updated");
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Failed to update");
      }
    });
  }

  const [docs, setDocs] = useState<{id:string; name:string; mime:string; size:number}[]>([]);
  useEffect(() => { if (open) getApplicationDocuments(application.id).then(r => setDocs(r.success ? r.data : [])); }, [open, application.id]);
  async function upload(file: File) {
    const data = new FormData(); data.set('file', file);
    const result = await uploadApplicationDocument(application.id, data);
    if (!result.success) toast.error(result.error); else { toast.success('Uploaded'); const r = await getApplicationDocuments(application.id); setDocs(r.success ? r.data : []); }
  }
  async function download(id: string) {
    const r = await downloadApplicationDocument(application.id, id);
    if (!r.success || !r.data) { toast.error(r.success ? "Document unavailable" : r.error); return; }
    const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(r.data.base64), c => c.charCodeAt(0))], { type: r.data.mime }));
    const a = document.createElement('a'); a.href = url; a.download = r.data.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const hasDocs = application.resumeFileName || application.coverLetterFileName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Documents - {application.company}
          </DialogTitle>
        </DialogHeader>

        {hasDocs && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2 mb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Attached Documents</p>
            {application.resumeFileName && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span>{application.resumeFileName}</span>
                <Badge variant="secondary" className="text-[9px] ml-auto">Resume</Badge>
              </div>
            )}
            {application.coverLetterFileName && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-3.5 w-3.5 text-emerald-500" />
                <span>{application.coverLetterFileName}</span>
                <Badge variant="secondary" className="text-[9px] ml-auto">Cover Letter</Badge>
              </div>
            )}
          </div>
        )}

        {!hasDocs && (
          <div className="text-center py-6 text-muted-foreground">
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No documents attached yet</p>
            <p className="text-xs mt-1">Enter document filenames to track them</p>
          </div>
        )}

        <div className="space-y-2">
          <Input type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" onChange={e => { const f=e.target.files?.[0]; if(f) void upload(f); e.target.value=''; }} />
          {docs.map(d => <div key={d.id} className="flex justify-between text-sm"><button onClick={() => download(d.id)}>{d.name}</button><button onClick={async () => { await deleteApplicationDocument(application.id,d.id); setDocs(v=>v.filter(x=>x.id!==d.id)); }}>Delete</button></div>)}
        </div>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Resume Filename</Label>
            <Input name="resumeFileName" value={resumeName} onChange={e => setResumeName(e.target.value)} placeholder="e.g. resume_v3.pdf" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Cover Letter Filename</Label>
            <Input name="coverLetterFileName" value={coverLetterName} onChange={e => setCoverLetterName(e.target.value)} placeholder="e.g. cover_letter.pdf" />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save Documents"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}