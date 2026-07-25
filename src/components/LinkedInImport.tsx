'use client';

import { useState, useTransition } from "react";
import { ExternalLink, LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchLinkedInMetadata } from "@/actions/linkedin";

export function LinkedInImport({ onImport }: { onImport: (company: string, role: string) => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [fetching, startFetch] = useTransition();
  const [result, setResult] = useState<{ company?: string; role?: string } | null>(null);

  function handleFetch() {
    startFetch(async () => {
      const res = await fetchLinkedInMetadata(url);
      if (res.success && res.data) {
        setResult(res.data);
        toast.success("Details extracted!");
      } else {
        toast.error(res.error ?? "Failed to fetch URL");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"><LinkIcon className="h-3.5 w-3.5" /> LinkedIn Import</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Import from LinkedIn</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Paste a LinkedIn job URL to auto-fill company and role.</p>
          <div className="flex gap-2">
            <Input placeholder="https://linkedin.com/jobs/view/..." value={url} onChange={e => setUrl(e.target.value)} className="flex-1" />
            <Button onClick={handleFetch} disabled={fetching || !url}>{fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}</Button>
          </div>
          {result && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div><Label className="text-xs text-muted-foreground">Company</Label><p className="font-medium">{result.company}</p></div>
              <div><Label className="text-xs text-muted-foreground">Role</Label><p className="font-medium">{result.role}</p></div>
              <Button size="sm" onClick={() => { if (result.company && result.role) onImport(result.company, result.role); setOpen(false); setResult(null); }} className="w-full mt-2">Use This Data</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
