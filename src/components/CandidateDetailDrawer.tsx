'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Star, Mail, MessageSquare, Send, Loader2, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCandidateRating, addCandidateNote, generateCandidateReply } from "@/actions/candidates";
import { getTemplates } from "@/actions/templates";
import type { CandidateCard } from "@/lib/types";

interface Props { candidate: CandidateCard; open: boolean; onOpenChange: (open: boolean) => void; }

export function CandidateDetailDrawer({ candidate, open, onOpenChange }: Props) {
  const [rating, setRating] = useState(candidate.rating ?? 0);
  const [isPending, startTransition] = useTransition();
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [draftedReply, setDraftedReply] = useState("");

  function handleRating(r: number) {
    setRating(r);
    startTransition(async () => {
      await updateCandidateRating(candidate.id, r);
    });
  }

  function handleAddNote() {
    if (!noteText.trim()) {
      toast.error("Please enter a note");
      return;
    }
    startTransition(async () => {
      const result = await addCandidateNote(candidate.id, noteText);
      if (result.success) {
        toast.success("Note added");
        setNoteText("");
        setShowNoteInput(false);
      } else {
        toast.error(result.error ?? "Failed to add note");
      }
    });
  }

  function handleOpenReply() {
    setShowReplyInput(true);
    setDraftedReply("");
    setSelectedTemplate("");
    setCustomInstructions("");
    getTemplates().then(r => { if (r.success) setTemplates(r.data ?? []); });
  }

  function handleGenerateReply() {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }
    startTransition(async () => {
      const result = await generateCandidateReply(candidate.id, selectedTemplate, customInstructions || undefined);
      if (result.success) {
        setDraftedReply(result.data?.body ?? "");
        toast.success("Reply drafted");
      } else if (!result.success) {
        toast.error(result.error ?? "Failed to generate reply");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {candidate.name}
            {candidate.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium flex items-center gap-1"><Mail className="h-3 w-3" /> {candidate.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Position</p>
                <p className="text-sm font-medium">{candidate.positionApplied}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> {candidate.phone ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Applied</p>
                <p className="text-sm font-medium">{formatDistanceToNow(new Date(candidate.appliedAt), { addSuffix: true })}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} onClick={() => handleRating(r)} disabled={isPending}>
                  <Star className={`h-5 w-5 ${r <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={handleOpenReply}><Send className="h-3 w-3" /> Send Reply</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowNoteInput(!showNoteInput)}><MessageSquare className="h-3 w-3" /> Add Note</Button>
          </div>

          {showNoteInput && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Add Note</Label>
                <Button variant="ghost" size="icon-xs" onClick={() => setShowNoteInput(false)}><X className="h-3 w-3" /></Button>
              </div>
              <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Enter your note about this candidate..." rows={3} className="text-sm" />
              <Button size="sm" onClick={handleAddNote} disabled={isPending || !noteText.trim()}>
                {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                {isPending ? "Saving..." : "Save Note"}
              </Button>
            </div>
          )}

          {showReplyInput && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">AI Reply Draft</Label>
                <Button variant="ghost" size="icon-xs" onClick={() => setShowReplyInput(false)}><X className="h-3 w-3" /></Button>
              </div>
              {!draftedReply ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Select Template</Label>
                    <Select value={selectedTemplate} onValueChange={(v: string | null) => { if (v) setSelectedTemplate(v); }}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                      <SelectContent>
                        {templates.length === 0 ? (
                          <SelectItem value="none" disabled>No templates available</SelectItem>
                        ) : (
                          templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Custom Instructions (optional)</Label>
                    <Textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder="Any special instructions for the AI..." rows={2} className="text-sm" />
                  </div>
                  <Button size="sm" onClick={handleGenerateReply} disabled={isPending || !selectedTemplate} className="gap-1">
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    {isPending ? "Generating..." : "Generate Reply"}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <Textarea value={draftedReply} onChange={e => setDraftedReply(e.target.value)} rows={6} className="text-sm font-mono" />
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" onClick={() => { toast.success("Reply copied to clipboard"); navigator.clipboard.writeText(draftedReply); }}>
                      <Send className="h-3 w-3" /> Copy & Send
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setDraftedReply(""); handleOpenReply(); }}>
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
