'use client';

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getTemplates, createTemplate, deleteTemplate } from "@/actions/templates";

const PLACEHOLDERS = ["{{applicantName}}", "{{position}}", "{{companyName}}"];

export function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) getTemplates().then(r => { if (r.success) setTemplates(r.data ?? []); });
  }, [open]);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createTemplate({
        name: formData.get("name") as string,
        subject: formData.get("subject") as string,
        body: formData.get("body") as string,
        isDefault: formData.get("isDefault") === "on",
        autoSend: formData.get("autoSend") === "on",
      });
      if (result.success) { toast.success("Template created"); getTemplates().then(r => { if (r.success) setTemplates(r.data ?? []); }); }
      else toast.error(result.error ?? "Failed");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTemplate(id);
      if (result.success) { setTemplates(prev => prev.filter(t => t.id !== id)); toast.success("Template deleted"); }
      else toast.error(result.error ?? "Failed");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2"><FileText className="h-4 w-4" /> Templates</Button>} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Email Templates</DialogTitle></DialogHeader>

        <div className="space-y-3 max-h-48 overflow-y-auto">
          {templates.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No templates yet</p>}
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">{t.name}{t.isDefault ? <span className="text-[10px] text-primary ml-2">Default</span> : ""}</p>
                <p className="text-xs text-muted-foreground">{t.subject}</p>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(t.id)} disabled={isPending}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Create Template</p>
          <form action={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input name="name" required className="h-8" placeholder="e.g. Initial Response" /></div>
              <div className="space-y-1"><Label className="text-xs">Subject</Label><Input name="subject" required className="h-8" placeholder="Re: {{applicantName}}" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Body <span className="text-muted-foreground font-normal">(Use placeholders: {PLACEHOLDERS.join(", ")})</span></Label><Textarea name="body" required rows={4} placeholder="Dear {{applicantName}}, ..." /></div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="isDefault" className="h-3 w-3" /> Set as default</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="autoSend" className="h-3 w-3" /> Auto-send</label>
            </div>
            <Button type="submit" size="sm" disabled={isPending}>Create Template</Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
