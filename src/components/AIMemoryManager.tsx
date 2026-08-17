'use client';

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, Trash2, CheckCircle, Edit2, X, Save, Filter, ChevronDown, ChevronUp, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getAIMemory, updateMemoryItem, confirmMemoryItem, deleteMemoryItem, addMemoryItem, clearMemoryCategory } from "@/actions/ai-memory";
import type { MemoryItem } from "@/actions/ai-memory";

const SOURCE_COLORS: Record<string, string> = {
  USER: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  RESUME: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  GMAIL: "bg-red-500/15 text-red-500 border-red-500/30",
  APPLICATION: "bg-purple-500/15 text-purple-500 border-purple-500/30",
  INTERVIEW: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  INFERENCE: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const CATEGORY_ICONS: Record<string, string> = {
  skill: "🔧",
  technicalSkills: "💻",
  softSkills: "🤝",
  experience: "💼",
  education: "🎓",
  preference: "⭐",
  achievement: "🏆",
  project: "🚀",
  language: "🌍",
  general: "📌",
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 85 ? "text-emerald-500" : pct >= 60 ? "text-amber-500" : "text-rose-500";
  return <span className={`text-[10px] font-mono font-semibold ${color}`}>{pct}%</span>;
}

interface EditingState {
  id: string;
  value: string;
}

export function AIMemoryManager() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("skill");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => { loadMemory(); }, []);

  async function loadMemory() {
    setLoading(true);
    const res = await getAIMemory();
    if (res.success && res.data) {
      setMemories(res.data.memories);
      setCategories(res.data.categories);
    }
    setLoading(false);
  }

  function handleToggleCollapse(cat: string) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleEdit(mem: MemoryItem) {
    setEditing({ id: mem.id, value: mem.value });
  }

  function handleCancelEdit() {
    setEditing(null);
  }

  function handleSaveEdit() {
    if (!editing) return;
    startTransition(async () => {
      const res = await updateMemoryItem(editing.id, editing.value);
      if (res.success) {
        toast.success("Memory updated");
        setEditing(null);
        loadMemory();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  function handleConfirm(id: string) {
    startTransition(async () => {
      const res = await confirmMemoryItem(id);
      if (res.success) {
        toast.success("Confirmed ✓");
        loadMemory();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteMemoryItem(id);
      if (res.success) {
        toast.success("Memory deleted");
        loadMemory();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  function handleClearCategory(cat: string) {
    startTransition(async () => {
      const res = await clearMemoryCategory(cat);
      if (res.success) {
        toast.success(`Cleared ${res.data?.deleted ?? 0} items from ${cat}`);
        loadMemory();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  function handleAddMemory() {
    if (!newKey.trim() || !newValue.trim()) {
      toast.error("Key and value are required");
      return;
    }
    startTransition(async () => {
      const res = await addMemoryItem(newCategory, newKey.trim(), newValue.trim());
      if (res.success) {
        toast.success("Memory added");
        setNewKey("");
        setNewValue("");
        setShowAdd(false);
        loadMemory();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  const filtered = filterCategory === "all"
    ? memories
    : memories.filter(m => m.category === filterCategory);

  const grouped = filtered.reduce((acc: Record<string, MemoryItem[]>, mem) => {
    if (!acc[mem.category]) acc[mem.category] = [];
    acc[mem.category].push(mem);
    return acc;
  }, {});

  const unconfirmedCount = memories.filter(m => !m.isConfirmed).length;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">AI Memory</h2>
            <p className="text-xs text-muted-foreground">
              {memories.length} facts · {unconfirmedCount} need review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Fact
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      {unconfirmedCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-xs">
            <strong>{unconfirmedCount} memory items</strong> extracted by AI need your review. Confirm correct facts or delete incorrect ones.
          </p>
        </div>
      )}

      {/* Add New Memory */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Add Manual Memory Fact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="text-sm bg-background border border-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/30 outline-none"
                  >
                    {["skill", "technicalSkills", "softSkills", "experience", "education", "preference", "achievement", "project", "language", "general"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Key (e.g. React)"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Value (e.g. 4 years experience)"
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddMemory} disabled={isPending} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={() => setFilterCategory("all")}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            All ({memories.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterCategory === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {CATEGORY_ICONS[cat] ?? "📌"} {cat} ({memories.filter(m => m.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Memory Groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20">
          <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold mb-2">No memories yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Connect Gmail, update your profile, or complete an interview to let HireFlow learn about you.
          </p>
          <Button onClick={() => setShowAdd(true)} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add your first fact
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <Card key={category} className="overflow-hidden">
              <CardHeader
                className="p-4 pb-3 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => handleToggleCollapse(category)}
              >
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span>{CATEGORY_ICONS[category] ?? "📌"}</span>
                  <span className="capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Badge variant="outline" className="text-[10px] ml-1">{items.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-destructive gap-1"
                    onClick={e => { e.stopPropagation(); handleClearCategory(category); }}
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </Button>
                  {collapsed.has(category) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </CardHeader>

              <AnimatePresence>
                {!collapsed.has(category) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/50">
                        {items.map(mem => (
                          <div key={mem.id} className={`px-4 py-3 flex items-start gap-3 group transition-colors ${!mem.isConfirmed ? "bg-amber-500/5" : ""}`}>
                            {/* Confirmed indicator */}
                            <div className="mt-0.5 flex-shrink-0">
                              {mem.isConfirmed
                                ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                : <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-500/60" />
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-foreground">{mem.key}</span>
                                <Badge variant="outline" className={`text-[9px] ${SOURCE_COLORS[mem.source] ?? SOURCE_COLORS.INFERENCE}`}>
                                  {mem.source}
                                </Badge>
                                <ConfidenceBadge confidence={mem.confidence} />
                              </div>

                              {editing?.id === mem.id ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <Input
                                    value={editing.value}
                                    onChange={e => setEditing({ ...editing, value: e.target.value })}
                                    className="h-7 text-xs"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") handleCancelEdit(); }}
                                  />
                                  <Button size="sm" className="h-7 gap-1 text-[10px]" onClick={handleSaveEdit} disabled={isPending}>
                                    <Save className="h-3 w-3" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7" onClick={handleCancelEdit}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground leading-relaxed">{mem.value}</p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {!mem.isConfirmed && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-emerald-500 hover:text-emerald-600"
                                  title="Confirm correct"
                                  onClick={() => handleConfirm(mem.id)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                              {editing?.id !== mem.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  title="Edit"
                                  onClick={() => handleEdit(mem)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive/70 hover:text-destructive"
                                title="Delete"
                                onClick={() => handleDelete(mem.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
