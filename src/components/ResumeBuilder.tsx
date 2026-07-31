'use client';

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Save, Plus, Loader2, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateResume, updateSection, addSection, deleteSection, reorderSections, createVersion } from "@/actions/resume-studio";
import { analyzeAts, resumeToText } from "@/lib/resume/ats";
import { RESUME_TEMPLATES } from "@/lib/resume/templates";
import { ResumePreview } from "./ResumePreview";
import { AiAssistantPanel } from "./AiAssistantPanel";
import { AtsPanel } from "./AtsPanel";

interface Props {
  resume: { id: string; name: string; title: string; summary: string; sections: { id: string; type: string; title: string; content: Record<string, unknown> }[]; versions: { id: string; versionNumber: number; notes?: string }[] };
  onBack: () => void;
}

const SECTION_TYPES = [
  { value: "EXPERIENCE", label: "Work Experience" },
  { value: "EDUCATION", label: "Education" },
  { value: "SKILLS", label: "Skills" },
  { value: "PROJECTS", label: "Projects" },
  { value: "CERTIFICATIONS", label: "Certifications" },
  { value: "LANGUAGES", label: "Languages" },
  { value: "AWARDS", label: "Awards" },
  { value: "CUSTOM", label: "Custom Section" },
];

type RightPanel = "ats" | "ai" | "templates";

export function ResumeBuilder({ resume: initial, onBack }: Props) {
  const [resume, setResume] = useState(initial);
  const [name, setName] = useState(initial.name ?? "");
  const [title, setTitle] = useState(initial.title ?? "");
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [sections, setSections] = useState<any[]>(initial.sections ?? []);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [rightPanel, setRightPanel] = useState<RightPanel>("ats");
  const [saving, setSaving] = useState(false);
  const [addSectionType, setAddSectionType] = useState("");

  const atsResult = analyzeAts(resumeToText({ title, summary, sections }), sections);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await Promise.all([
      updateResume(resume.id, { name, title, summary, atsScore: atsResult.overallScore }),
      ...sections.map((s: any) => updateSection(s.id, { title: s.title, content: s.content, order: s.order })),
    ]);
    toast.success("Resume saved");
    setSaving(false);
  }, [resume.id, name, title, summary, sections, atsResult.overallScore]);

  function handleAddSection(type: string) {
    const label = SECTION_TYPES.find(t => t.value === type)?.label ?? "Custom Section";
    addSection(resume.id, type, label).then(result => {
      if (result.success && result.data) {
        setSections(prev => [...prev, result.data]);
        toast.success("Section added");
      }
    });
    setAddSectionType("");
  }

  function handleDeleteSection(id: string) {
    deleteSection(id);
    setSections(prev => prev.filter(s => s.id !== id));
  }

  function handleUpdateSection(id: string, data: any) {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }

  function handleMoveSection(id: string, direction: "up" | "down") {
    const idx = sections.findIndex(s => s.id === id);
    if (idx < 0) return;
    const newSections = [...sections];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newSections.length) return;
    [newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]];
    setSections(newSections.map((s, i) => ({ ...s, order: i })));
    reorderSections(newSections.map(s => s.id));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 -mt-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <Input value={name} onChange={e => setName(e.target.value)} className="w-48 h-8 font-semibold" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
            <Button variant={rightPanel === "ats" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setRightPanel("ats")}>ATS</Button>
            <Button variant={rightPanel === "ai" ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setRightPanel("ai")}><Sparkles className="h-3 w-3" /> AI</Button>
            <Button variant={rightPanel === "templates" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setRightPanel("templates")}>Style</Button>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => createVersion(resume.id, "Manual save").then(() => toast.success("Version created"))}>
            Save Version
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Sections */}
        <div className="w-80 border-r overflow-y-auto p-4 space-y-4 flex-shrink-0">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Job Title</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Software Engineer" className="h-8 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Professional Summary</label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Brief professional summary..." rows={3} className="text-sm" />
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Sections</p>
              <Select value={addSectionType} onValueChange={(v) => { if (v) handleAddSection(v); }}>
                <SelectTrigger className="h-6 w-auto text-[10px] gap-1 border-dashed"><Plus className="h-2.5 w-2.5" /> Add</SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              {sections.map((section) => (
                <div key={section.id} className="flex items-center gap-1 p-2 rounded-lg bg-muted/30 group hover:bg-muted/50">
                  <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <SectionEditor section={section} onChange={(data) => handleUpdateSection(section.id, data)} />
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon-xs" className="h-5 w-5" onClick={() => handleMoveSection(section.id, "up")}>↑</Button>
                    <Button variant="ghost" size="icon-xs" className="h-5 w-5" onClick={() => handleMoveSection(section.id, "down")}>↓</Button>
                    <Button variant="ghost" size="icon-xs" className="h-5 w-5 text-destructive" onClick={() => handleDeleteSection(section.id)}><Trash2 className="h-2.5 w-2.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center — Preview */}
        <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <ResumePreview title={title} summary={summary} sections={sections} template={selectedTemplate} />
        </div>

        {/* Right Panel */}
        <div className="w-72 border-l overflow-y-auto flex-shrink-0">
          {rightPanel === "ats" && <AtsPanel result={atsResult} />}
          {rightPanel === "ai" && <AiAssistantPanel resumeText={resumeToText({ title, summary, sections })} onResult={(r) => toast.success("AI result received")} />}
          {rightPanel === "templates" && (
            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Template</p>
              <div className="grid grid-cols-2 gap-2">
                {RESUME_TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`p-2 rounded-lg border text-left text-xs transition-all ${selectedTemplate === t.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}>
                    <div className="w-full h-8 rounded bg-gradient-to-br mb-1" style={{ background: `linear-gradient(135deg, ${t.accentColor}20, ${t.accentColor}05)` }} />
                    <p className="font-medium">{t.name}</p>
                    <p className="text-[9px] text-muted-foreground capitalize">{t.category}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ section, onChange }: { section: { id: string; type: string; title: string; content: Record<string, unknown> }; onChange: (data: { title?: string; content?: Record<string, unknown> }) => void }) {
  const [expanded, setExpanded] = useState(false);
  const content = section.content as Record<string, unknown> ?? {};
  const items = Array.isArray(content.items) ? content.items : [];
  const textOf = (v: unknown) => (typeof v === "string" ? v : "");

  function addItem() {
    const newItem = section.type === "SKILLS"
      ? { skills: [] }
      : section.type === "EDUCATION"
        ? { school: "", degree: "", field: "", year: "" }
        : { company: "", role: "", period: "", bullets: [""] };
    onChange({ content: { items: [...items, newItem] } });
  }

  function updateItem(idx: number, data: any) {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], ...data };
    onChange({ content: { items: newItems } });
  }

  function removeItem(idx: number) {
    onChange({ content: { items: items.filter((_: unknown, i: number) => i !== idx) } });
  }

  return (
    <div onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="cursor-pointer">
      <p className="text-xs font-medium truncate">{section.title}</p>
      <p className="text-[9px] text-muted-foreground">{items.length} items · {section.type}</p>
      {expanded && (
        <div className="mt-2 space-y-2" onClick={e => e.stopPropagation()}>
          <Input value={section.title} onChange={e => onChange({ title: e.target.value })} className="h-6 text-[10px]" />
          <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
            {items.map((item: Record<string, unknown>, idx: number) => (
              <div key={idx} className="p-2 rounded bg-background border space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-muted-foreground font-medium">Item {idx + 1}</p>
                  <button onClick={() => removeItem(idx)} className="text-[9px] text-destructive">Remove</button>
                </div>
                {section.type === "SKILLS" ? (
                  <Input value={Array.isArray(item.skills) ? item.skills.join(", ") : ""} onChange={e => updateItem(idx, { skills: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} placeholder="Skills (comma-separated)" className="h-6 text-[10px]" />
                ) : section.type === "EDUCATION" ? (
                  <div className="space-y-1">
                    <Input value={textOf(item.school)} onChange={e => updateItem(idx, { school: e.target.value })} placeholder="School" className="h-6 text-[10px]" />
                    <Input value={textOf(item.degree)} onChange={e => updateItem(idx, { degree: e.target.value })} placeholder="Degree" className="h-6 text-[10px]" />
                    <Input value={textOf(item.year)} onChange={e => updateItem(idx, { year: e.target.value })} placeholder="Year" className="h-6 text-[10px]" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-1">
                      <Input value={textOf(item.company)} onChange={e => updateItem(idx, { company: e.target.value })} placeholder="Company" className="h-6 text-[10px]" />
                      <Input value={textOf(item.role)} onChange={e => updateItem(idx, { role: e.target.value })} placeholder="Role" className="h-6 text-[10px]" />
                    </div>
                    <Input value={textOf(item.period)} onChange={e => updateItem(idx, { period: e.target.value })} placeholder="2020 - Present" className="h-6 text-[10px]" />
                    <Textarea
                      value={Array.isArray(item.bullets) ? item.bullets.join("\n") : ""}
                      onChange={e => updateItem(idx, { bullets: e.target.value.split("\n").filter((b: string) => b.trim()) })}
                      placeholder="Achievement bullets (one per line)"
                      rows={2}
                      className="text-[10px]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full h-6 text-[10px] gap-1" onClick={addItem}><Plus className="h-2.5 w-2.5" /> Add Item</Button>
        </div>
      )}
    </div>
  );
}
