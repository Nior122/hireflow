'use client';

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { User, Mail, Phone, Link2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateApplication } from "@/actions/applications";
import type { ApplicationCard } from "@/lib/types";

interface Props {
  application: ApplicationCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactManager({ application, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateApplication(application.id, formData);
      if (result.success) {
        toast.success("Contact info updated");
        onOpenChange(false);
      } else {
        toast.error(result.error ?? "Failed to update");
      }
    });
  }

  const hasContact = application.contactName || application.contactEmail || application.contactPhone || application.contactLinkedin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact - {application.company}
          </DialogTitle>
        </DialogHeader>

        {hasContact && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-2 mb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Saved Contact</p>
            {application.contactName && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{application.contactName}</span>
              </div>
            )}
            {application.contactEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{application.contactEmail}</span>
              </div>
            )}
            {application.contactPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{application.contactPhone}</span>
              </div>
            )}
            {application.contactLinkedin && (
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{application.contactLinkedin}</span>
              </div>
            )}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Contact Name</Label>
            <Input name="contactName" defaultValue={application.contactName ?? ""} placeholder="e.g. Jane Smith" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
            <Input name="contactEmail" type="email" defaultValue={application.contactEmail ?? ""} placeholder="jane@company.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</Label>
            <Input name="contactPhone" type="tel" defaultValue={application.contactPhone ?? ""} placeholder="+1 (555) 123-4567" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" /> LinkedIn URL</Label>
            <Input name="contactLinkedin" type="url" defaultValue={application.contactLinkedin ?? ""} placeholder="https://linkedin.com/in/janesmith" />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save Contact"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}