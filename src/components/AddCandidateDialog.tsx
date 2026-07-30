'use client';

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createCandidate } from "@/actions/candidates";

interface Props {
  onCandidateCreated: () => void;
}

export function AddCandidateDialog({ onCandidateCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const positionApplied = (formData.get("positionApplied") as string)?.trim();
    const resumeText = (formData.get("resumeText") as string)?.trim();
    const source = (formData.get("source") as string)?.trim();
    const notes = (formData.get("notes") as string)?.trim();

    if (!name || !email || !positionApplied) {
      toast.error("Name, email, and position are required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    startTransition(async () => {
      const result = await createCandidate({
        name,
        email,
        phone: phone || undefined,
        positionApplied,
        resumeText: resumeText || undefined,
        experienceSummary: notes || undefined,
        keySkills: source ? [source] : [],
      });

      if (result.success) {
        toast.success(`Candidate ${name} added successfully`);
        setOpen(false);
        onCandidateCreated();
      } else {
        toast.error(result.error ?? "Failed to add candidate");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Candidate</Button>} />
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Candidate</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Name *</Label>
              <Input name="name" placeholder="Jane Smith" required />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Email *</Label>
              <Input name="email" type="email" placeholder="jane@example.com" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Phone</Label>
              <Input name="phone" type="tel" placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Position Applied *</Label>
              <Input name="positionApplied" placeholder="Senior Frontend Engineer" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Source</Label>
            <Input name="source" placeholder="e.g. LinkedIn, Referral, Company Site" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Resume Text</Label>
            <Textarea name="resumeText" placeholder="Paste resume content here (optional, for AI analysis)..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Notes</Label>
            <Textarea name="notes" placeholder="Any notes about this candidate..." rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Adding..." : "Add Candidate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
