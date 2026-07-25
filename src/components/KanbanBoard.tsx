'use client';

import { useState, useCallback, useMemo } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent, type DragOverEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { AddApplicationDialog } from "./AddApplicationDialog";
import { moveApplication } from "@/actions/applications";
import { STATUS_ORDER, STATUS_LABELS, type ApplicationCard, type ApplicationStatus } from "@/lib/types";

interface KanbanBoardProps { initialApplications: ApplicationCard[]; }

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const [applications, setApplications] = useState<ApplicationCard[]>(initialApplications);
  const [activeCard, setActiveCard] = useState<ApplicationCard | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ApplicationStatus>("UNAPPLIED");

  const columns = useMemo(() => {
    const grouped: Record<string, ApplicationCard[]> = {};
    for (const s of STATUS_ORDER) grouped[s] = [];
    for (const a of applications) if (grouped[a.status]) grouped[a.status].push(a);
    return grouped;
  }, [applications]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const card = applications.find(a => a.id === e.active.id);
    if (card) setActiveCard(card);
  }, [applications]);

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
    const activeApp = applications.find(a => a.id === activeId);
    if (!activeApp) return;

    const overStatus = STATUS_ORDER.includes(overId as ApplicationStatus) ? (overId as ApplicationStatus) : activeApp.status;
    if (activeApp.status === overStatus && activeId === overId) return;

    const overIndex = applications.findIndex(a => a.id === overId);
    const targetPosition = overIndex >= 0 && applications[overIndex].status === overStatus ? applications[overIndex].position : columns[overStatus].length;
    const snapshot = [...applications];

    setApplications(prev => {
      if (activeApp.status === overStatus) {
        const col = prev.filter(a => a.status === overStatus && a.id !== activeId).sort((a, b) => a.position - b.position);
        const insertAt = Math.min(targetPosition, col.length);
        col.splice(insertAt, 0, { ...activeApp, status: overStatus, position: insertAt });
        const reindexed = col.map((a, i) => ({ ...a, position: i }));
        const others = prev.filter(a => a.status !== overStatus || a.id === activeId);
        return [...others, ...reindexed];
      }
      const fromCol = prev.filter(a => a.status === activeApp.status && a.id !== activeId).map((a, i) => ({ ...a, position: i }));
      const toCol = prev.filter(a => a.status === overStatus && a.id !== activeId).sort((a, b) => a.position - b.position);
      const insertAt = Math.min(targetPosition, toCol.length);
      toCol.splice(insertAt, 0, { ...activeApp, status: overStatus, position: insertAt });
      const toReindexed = toCol.map((a, i) => ({ ...a, position: i }));
      return [...fromCol, ...toReindexed];
    });

    const result = await moveApplication(activeId, overStatus, targetPosition);
    if (!result.success) { toast.error(result.error); setApplications(snapshot); }
  }, [applications, columns]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage your job applications</p>
        </div>
        <AddApplicationDialog />
      </div>

      {/* Mobile: Horizontal tab bar with snap scroll */}
      <div className="xl:hidden mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {STATUS_ORDER.map(status => {
            const count = columns[status].length;
            const isActive = activeTab === status;
            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`snap-start flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {STATUS_LABELS[status]}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${isActive ? "opacity-80" : "opacity-60"}`}>({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Desktop: Full grid */}
        <div className="hidden xl:grid grid-cols-6 gap-4">
          {STATUS_ORDER.map(status => (
            <KanbanColumn key={status} status={status} applications={columns[status]} isOver={overColumn === status} />
          ))}
        </div>

        {/* Mobile: Show active tab only */}
        <div className="xl:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <KanbanColumn
                status={activeTab}
                applications={columns[activeTab]}
                isOver={overColumn === activeTab}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <DragOverlay>
          {activeCard ? <div className="rotate-3 scale-105"><KanbanCard application={activeCard} isDragging /></div> : null}
        </DragOverlay>
      </DndContext>
    </motion.div>
  );
}