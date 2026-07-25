'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Plus, FileText, Star, Copy, Trash2, ExternalLink, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getResumes, createResume, deleteResume, duplicateResume, setDefaultResume } from "@/actions/resume-studio";
import { ResumeBuilder } from "./ResumeBuilder";

interface ResumeItem {
  id: string;
  name: string;
  title: string;
  summary: string;
  isDefault: boolean;
  atsScore: number;
  createdAt: string;
  updatedAt: string;
  sections: any[];
  versions: any[];
}

export function ResumeStudio() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openBuilder, setOpenBuilder] = useState<ResumeItem | null>(null);

  useEffect(() => { loadResumes(); }, []);

  async function loadResumes() {
    const result = await getResumes();
    if (result.success && result.data) setResumes(result.data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await createResume({ name: newName.trim() });
    if (result.success) {
      toast.success("Resume created!");
      setCreateOpen(false);
      setNewName("");
      loadResumes();
    } else toast.error(result.error ?? "Failed");
    setCreating(false);
  }

  async function handleDuplicate(id: string) {
    const result = await duplicateResume(id);
    if (result.success) { toast.success("Resume duplicated"); loadResumes(); }
    else toast.error(result.error ?? "Failed");
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const result = await deleteResume(deleteId);
    if (result.success) { toast.success("Resume deleted"); setDeleteId(null); loadResumes(); }
    else toast.error(result.error ?? "Failed");
    setDeleting(false);
  }

  async function handleSetDefault(id: string) {
    const result = await setDefaultResume(id);
    if (result.success) { toast.success("Default resume updated"); loadResumes(); }
  }

  if (openBuilder) {
    return <ResumeBuilder resume={openBuilder} onBack={() => { setOpenBuilder(null); loadResumes(); }} />;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Resume Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">Build, optimize, and manage your professional resumes</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Resume</Button>
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-semibold mb-2">No resumes yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Create your first resume to get started</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Create Your First Resume</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes.map((resume, i) => (
            <motion.div key={resume.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => setOpenBuilder(resume)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{resume.name}</h3>
                      {resume.title && <p className="text-xs text-muted-foreground truncate mt-0.5">{resume.title}</p>}
                    </div>
                    {resume.isDefault && <Badge className="text-[10px] bg-primary/10 text-primary flex-shrink-0">Default</Badge>}
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${resume.atsScore >= 70 ? "text-emerald-500" : resume.atsScore >= 40 ? "text-amber-500" : "text-rose-500"}`}>{resume.atsScore || "--"}</p>
                      <p className="text-[9px] text-muted-foreground">ATS</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                        <span>{resume.sections.length} sections</span>
                        <span>·</span>
                        <span>{resume.versions.length} versions</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Updated {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {!resume.isDefault && (
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" onClick={() => handleSetDefault(resume.id)}>
                        <Star className="h-3 w-3" /> Set Default
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1" onClick={() => handleDuplicate(resume.id)}>
                      <Copy className="h-3 w-3" /> Duplicate
                    </Button>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => setDeleteId(resume.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create New Resume</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resume Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Software Engineer Resume" autoFocus onKeyDown={e => e.key === "Enter" && handleCreate()} />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {creating ? "Creating..." : "Create Resume"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The resume and all its versions will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
