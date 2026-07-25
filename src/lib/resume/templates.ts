export interface ResumeTemplate {
  id: string;
  name: string;
  category: "modern" | "classic" | "executive" | "minimal" | "tech" | "creative";
  description: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: "left" | "center" | "full-width" | "sidebar";
  sectionStyle: "bordered" | "underlined" | "minimal" | "accent-bar";
  spacing: "compact" | "normal" | "relaxed";
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    category: "modern",
    description: "Clean, contemporary design with accent colors",
    accentColor: "#2563eb",
    fontFamily: "Inter, sans-serif",
    headerStyle: "left",
    sectionStyle: "accent-bar",
    spacing: "normal",
  },
  {
    id: "classic",
    name: "Classic",
    category: "classic",
    description: "Traditional, professional layout trusted by recruiters",
    accentColor: "#1f2937",
    fontFamily: "Georgia, serif",
    headerStyle: "center",
    sectionStyle: "underlined",
    spacing: "normal",
  },
  {
    id: "executive",
    name: "Executive",
    category: "executive",
    description: "Sophisticated design for senior professionals",
    accentColor: "#0f172a",
    fontFamily: "Georgia, serif",
    headerStyle: "center",
    sectionStyle: "bordered",
    spacing: "relaxed",
  },
  {
    id: "minimal",
    name: "Minimal",
    category: "minimal",
    description: "Ultra-clean with maximum white space",
    accentColor: "#64748b",
    fontFamily: "Inter, sans-serif",
    headerStyle: "left",
    sectionStyle: "minimal",
    spacing: "relaxed",
  },
  {
    id: "tech",
    name: "Tech",
    category: "tech",
    description: "Optimized for tech/engineering roles",
    accentColor: "#059669",
    fontFamily: "JetBrains Mono, monospace",
    headerStyle: "left",
    sectionStyle: "accent-bar",
    spacing: "compact",
  },
  {
    id: "creative",
    name: "Creative",
    category: "creative",
    description: "Bold design for creative professionals",
    accentColor: "#7c3aed",
    fontFamily: "Inter, sans-serif",
    headerStyle: "full-width",
    sectionStyle: "accent-bar",
    spacing: "normal",
  },
];

export function getTemplate(id: string): ResumeTemplate {
  return RESUME_TEMPLATES.find(t => t.id === id) ?? RESUME_TEMPLATES[0];
}
