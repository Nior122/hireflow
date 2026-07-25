'use client';

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Edit, Trash2, ExternalLink, Building2, User, Paperclip, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { STATUS_LABELS, STATUS_COLORS, type ApplicationCard, type ApplicationStatus } from "@/lib/types";
import { EditApplicationDialog } from "./EditApplicationDialog";
import { DeleteApplicationAlert } from "./DeleteApplicationAlert";
import { ActivityTimeline } from "./ActivityTimeline";
import { ReminderPanel } from "./ReminderPanel";
import { ContactManager } from "./ContactManager";
import { DocumentManager } from "./DocumentManager";
import { ResumeMatcher } from "./ResumeMatcher";

interface KanbanCardProps { application: ApplicationCard; isDragging?: boolean; }

export function KanbanCard({ application, isDragging }: KanbanCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: application.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const hasContact = application.contactName || application.contactEmail || application.contactPhone || application.contactLinkedin;
  const hasDocs = application.resumeFileName || application.coverLetterFileName;

  return (
    <>
      <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1, ...(isSortDragging || isDragging ? { scale: 1.05, zIndex: 50 } : {}) }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} whileHover={{ scale: 1.02, y: -2 }}>
        <Card ref={setNodeRef} style={style} {...attributes} {...listeners} className={`relative cursor-grab active:cursor-grabbing group transition-shadow ${isSortDragging || isDragging ? "shadow-2xl ring-2 ring-primary/20 z-50" : "hover:shadow-lg"}`}>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{application.company}</h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{application.role}</p>
                {application.source && (
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                    <Building2 className="h-2.5 w-2.5" />{application.source}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger onClick={e => e.stopPropagation()} render={<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {application.link && (
                    <DropdownMenuItem render={<a href={application.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} />}>
                      <ExternalLink className="h-4 w-4" /> Open URL
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditOpen(true); }}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={e => { e.stopPropagation(); setDeleteOpen(true); }} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center justify-between mt-3">
              <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[application.status as ApplicationStatus]}`}>
                {STATUS_LABELS[application.status as ApplicationStatus]}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-border/50 flex-wrap">
              <Button variant="ghost" size="xs" className="gap-1 text-muted-foreground" onClick={e => { e.stopPropagation(); setContactOpen(true); }}>
                <User className="h-3 w-3" />
                {hasContact ? "Contact" : "Add Contact"}
              </Button>
              <Button variant="ghost" size="xs" className="gap-1 text-muted-foreground" onClick={e => { e.stopPropagation(); setDocOpen(true); }}>
                <Paperclip className="h-3 w-3" />
                {hasDocs ? "Docs" : "Add Docs"}
              </Button>
              <ActivityTimeline applicationId={application.id} applicationCompany={application.company} />
              <ReminderPanel applicationId={application.id} />
              <Button variant="ghost" size="xs" className="gap-1 text-amber-600" onClick={e => { e.stopPropagation(); setResumeOpen(true); }}>
                <Sparkles className="h-3 w-3" />
                Match
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <EditApplicationDialog application={application} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteApplicationAlert applicationId={application.id} company={application.company} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <ContactManager application={application} open={contactOpen} onOpenChange={setContactOpen} />
      <DocumentManager application={application} open={docOpen} onOpenChange={setDocOpen} />
      <ResumeMatcher
        company={application.company}
        role={application.role}
        jobDescription={application.notes ?? `${application.role} at ${application.company}`}
        open={resumeOpen}
        onOpenChange={setResumeOpen}
      />
    </>
  );
}