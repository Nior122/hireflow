'use client';

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, type ApplicationCard, type ApplicationStatus } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps { status: ApplicationStatus; applications: ApplicationCard[]; isOver: boolean; }

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

export function KanbanColumn({ status, applications, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status });
  const sorted = [...applications].sort((a, b) => a.position - b.position);

  return (
    <div ref={setNodeRef} className={cn("flex flex-col gap-3 p-4 rounded-xl min-h-[200px] transition-all", isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/30")}>
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{applications.length}</span>
      </div>
      <SortableContext items={sorted.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-3 flex-1">
          {sorted.map(app => (
            <motion.div key={app.id} layout><KanbanCard application={app} /></motion.div>
          ))}
          {applications.length === 0 && (
            <div className={cn("flex-1 border-2 border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground transition-all", isOver ? "border-primary/50 bg-primary/5 text-primary" : "border-border/50")}>
              {isOver ? "Drop here" : "No applications"}
            </div>
          )}
        </motion.div>
      </SortableContext>
    </div>
  );
}
