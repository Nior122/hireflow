'use client';

import { useState, useCallback, useMemo } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, type DragOverEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Star, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_COLORS, CANDIDATE_STATUS_ORDER, type CandidateCard, type CandidateStatus } from "@/lib/types";
import { moveCandidate } from "@/actions/candidates";
import { CandidateDetailDrawer } from "./CandidateDetailDrawer";
import { SchedulingAssistant } from "./SchedulingAssistant";

interface Props { initialCandidates: CandidateCard[]; }

function CandidateCardItem({ candidate, isDragging, onClick }: { candidate: CandidateCard; isDragging?: boolean; onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortDragging } = useSortable({ id: candidate.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn("cursor-grab active:cursor-grabbing group hover:shadow-md transition-shadow", isSortDragging || isDragging ? "shadow-2xl ring-2 ring-primary/20 z-50" : "")}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{candidate.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{candidate.positionApplied}</p>
          </div>
          {candidate.rating && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: candidate.rating }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {candidate.email}</span>
        </div>
        {candidate.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {candidate.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0">{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineColumn({ status, candidates, isOver, onSelectCandidate }: { status: CandidateStatus; candidates: CandidateCard[]; isOver: boolean; onSelectCandidate: (candidate: CandidateCard) => void }) {
  const { setNodeRef } = useDroppable({ id: status });
  const sorted = [...candidates].sort((a, b) => a.position - b.position);

  return (
    <div ref={setNodeRef} className={cn("flex flex-col gap-3 p-4 rounded-xl min-h-[200px] transition-all", isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/30")}>
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">{CANDIDATE_STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{candidates.length}</span>
      </div>
      <SortableContext items={sorted.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3 flex-1">
          {sorted.map(c => <CandidateCardItem key={c.id} candidate={c} onClick={() => onSelectCandidate(c)} />)}
          {candidates.length === 0 && (
            <div className={cn("flex-1 border-2 border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground transition-all", isOver ? "border-primary/50 bg-primary/5 text-primary" : "border-border/50")}>
              {isOver ? "Drop here" : "No candidates"}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function CandidatePipeline({ initialCandidates }: Props) {
  const [candidates, setCandidates] = useState<CandidateCard[]>(initialCandidates);
  const [activeCard, setActiveCard] = useState<CandidateCard | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateCard | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [schedulingCandidate, setSchedulingCandidate] = useState<CandidateCard | null>(null);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of candidates) {
      for (const t of c.tags) set.add(t);
    }
    return Array.from(set);
  }, [candidates]);

  // Filter candidates by search and tag
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const q = search.toLowerCase();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.positionApplied.toLowerCase().includes(q);
      const matchesTag = !selectedTag || c.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [candidates, search, selectedTag]);

  const columns = useMemo(() => {
    const grouped: Record<string, CandidateCard[]> = {};
    for (const s of CANDIDATE_STATUS_ORDER) grouped[s] = [];
    for (const c of filteredCandidates) if (grouped[c.status]) grouped[c.status].push(c);
    return grouped;
  }, [filteredCandidates]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const card = candidates.find(c => c.id === e.active.id);
    if (card) setActiveCard(card);
  }, [candidates]);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    setOverColumn(String(e.over?.data?.current?.sortable?.containerId ?? e.over?.id ?? null));
  }, []);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveCard(null);
    setOverColumn(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeCand = candidates.find(c => c.id === activeId);
    if (!activeCand) return;

    const overStatus = CANDIDATE_STATUS_ORDER.includes(overId as CandidateStatus) ? (overId as CandidateStatus) : activeCand.status;
    if (activeCand.status === overStatus && activeId === overId) return;

    const snapshot = [...candidates];
    const overIndex = candidates.findIndex(c => c.id === overId);
    const targetPosition = overIndex >= 0 && candidates[overIndex].status === overStatus ? candidates[overIndex].position : columns[overStatus].length;

    setCandidates(prev => {
      if (activeCand.status === overStatus) {
        const col = prev.filter(c => c.status === overStatus && c.id !== activeId).sort((a, b) => a.position - b.position);
        const insertAt = Math.min(targetPosition, col.length);
        col.splice(insertAt, 0, { ...activeCand, status: overStatus, position: insertAt });
        const reindexed = col.map((c, i) => ({ ...c, position: i }));
        const others = prev.filter(c => c.status !== overStatus || c.id === activeId);
        return [...others, ...reindexed];
      }
      const fromCol = prev.filter(c => c.status === activeCand.status && c.id !== activeId).map((c, i) => ({ ...c, position: i }));
      const toCol = prev.filter(c => c.status === overStatus && c.id !== activeId).sort((a, b) => a.position - b.position);
      const insertAt = Math.min(targetPosition, toCol.length);
      toCol.splice(insertAt, 0, { ...activeCand, status: overStatus, position: insertAt });
      return [...fromCol, ...toCol.map((c, i) => ({ ...c, position: i }))];
    });

    const result = await moveCandidate(activeId, overStatus, targetPosition);
    if (!result.success) { toast.error(result.error); setCandidates(snapshot); }

    // Auto-open scheduling assistant when candidate moves to INTERVIEW
    if (overStatus === "INTERVIEW" && activeCand.status !== "INTERVIEW") {
      const movedCand = candidates.find(c => c.id === activeId);
      if (movedCand) {
        setSchedulingCandidate(movedCand);
        setSchedulingOpen(true);
      }
    }
  }, [candidates, columns]);

  function handleSelectCandidate(candidate: CandidateCard) {
    setSelectedCandidate(candidate);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-4">
      {(allTags.length > 0 || candidates.length > 0) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
          <input
            type="text"
            placeholder="Filter candidates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-full sm:w-64 px-3 rounded-lg border bg-background text-xs"
          />
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Tags:</span>
              <Badge
                variant={selectedTag === null ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => setSelectedTag(null)}
              >
                All
              </Badge>
              {allTags.map(t => (
                <Badge
                  key={t}
                  variant={selectedTag === t ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {CANDIDATE_STATUS_ORDER.map(status => (
            <PipelineColumn key={status} status={status} candidates={columns[status]} isOver={overColumn === status} onSelectCandidate={handleSelectCandidate} />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <div className="rotate-3 scale-105"><CandidateCardItem candidate={activeCard} isDragging /></div> : null}
        </DragOverlay>
        {selectedCandidate && (
          <CandidateDetailDrawer candidate={selectedCandidate} open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) setSelectedCandidate(null); }} />
        )}
        {schedulingCandidate && (
          <SchedulingAssistant
            candidateId={schedulingCandidate.id}
            candidateName={schedulingCandidate.name}
            candidateEmail={schedulingCandidate.email}
            positionApplied={schedulingCandidate.positionApplied}
            open={schedulingOpen}
            onOpenChange={(open) => { setSchedulingOpen(open); if (!open) setSchedulingCandidate(null); }}
          />
        )}
      </DndContext>
    </div>
  );
}
