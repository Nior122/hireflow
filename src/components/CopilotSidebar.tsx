'use client';

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, MessageSquare, Pin, Trash2, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getConversations, createConversation, deleteConversation, togglePin, renameConversation } from "@/actions/copilot";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ConversationItem {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: Date;
}

interface Props {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  roleContext: string;
}

export function CopilotSidebar({ activeId, onSelect, onNew, roleContext }: Props) {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    const result = await getConversations();
    if (result.success && result.data) {
      setConversations(result.data.map(c => ({
        id: c.id,
        title: c.title,
        pinned: c.pinned,
        updatedAt: new Date(c.updatedAt),
      })));
    }
  }

  async function handleNewConversation() {
    const result = await createConversation("New conversation", roleContext);
    if (result.success && result.data) {
      setConversations(prev => [{ id: result.data!.id, title: result.data!.title, pinned: false, updatedAt: new Date() }, ...prev]);
      onSelect(result.data.id);
      onNew();
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteConversation(id);
    if (result.success) {
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) onNew();
    }
  }

  async function handlePin(id: string) {
    await togglePin(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }

  async function handleRename(id: string) {
    if (editTitle.trim()) {
      await renameConversation(id, editTitle.trim());
      setConversations(prev => prev.map(c => c.id === id ? { ...c, title: editTitle.trim() } : c));
    }
    setEditingId(null);
  }

  return (
    <div className="flex flex-col h-full bg-muted/20 border-r">
      <div className="p-3 border-b">
        <Button onClick={handleNewConversation} className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.map(conv => (
          <div
            key={conv.id}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
              activeId === conv.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
            )}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
              {editingId === conv.id ? (
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleRename(conv.id); if (e.key === "Escape") setEditingId(null); }}
                  onBlur={() => handleRename(conv.id)}
                  onClick={e => e.stopPropagation()}
                  className="h-5 text-xs px-1 py-0"
                  autoFocus
                />
              ) : (
                <>
                  <p className="truncate text-xs">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {conv.pinned && <Pin className="h-2 w-2 inline mr-0.5" />}
                    {formatDistanceToNow(conv.updatedAt, { addSuffix: true })}
                  </p>
                </>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon-xs" className="h-5 w-5 opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditingId(conv.id); setEditTitle(conv.title); }}>
                  <Pencil className="h-3 w-3 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePin(conv.id)}>
                  <Pin className="h-3 w-3 mr-2" /> {conv.pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(conv.id)} className="text-destructive">
                  <Trash2 className="h-3 w-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {conversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No conversations yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
