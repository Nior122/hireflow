'use client';

import { useMemo } from "react";
import { getTemplate } from "@/lib/resume/templates";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  summary: string;
  sections: { id: string; type: string; title: string; content: Record<string, unknown> }[];
  template: string;
}

export function ResumePreview({ title, summary, sections, template }: Props) {
  const tpl = useMemo(() => getTemplate(template), [template]);

  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections]);

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-950 shadow-xl rounded-xl overflow-hidden">
      <div className="p-8 space-y-6" style={{ fontFamily: tpl.fontFamily }}>
        {/* Header */}
        <div className={cn("space-y-1", tpl.headerStyle === "center" ? "text-center" : "text-left")}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title || "Job Title"}</h1>
          {summary && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{summary}</p>}
        </div>

        {/* Sections */}
        {sortedSections.map((section) => (
          <ResumeSectionPreview key={section.id} section={section} template={tpl} />
        ))}
      </div>
    </div>
  );
}

function ResumeSectionPreview({ section, template }: { section: { type: string; title: string; content: Record<string, unknown> }; template: { id: string; name: string; fontFamily: string; accentColor: string; headerStyle: string; sectionStyle: string } }) {
  const content = section.content as Record<string, unknown> ?? {};
  const items = Array.isArray(content.items) ? content.items : [];

  if (items.length === 0 && section.type !== "SKILLS") return null;

  return (
    <div className={cn(
      "space-y-3",
      template.sectionStyle === "accent-bar" ? "border-l-2 pl-3" : "",
      template.sectionStyle === "bordered" ? "border rounded-lg p-3" : "",
      template.sectionStyle === "underlined" ? "pb-2" : "",
    )}
      style={template.sectionStyle === "accent-bar" ? { borderColor: template.accentColor } : {}}
    >
      <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider"
        style={template.sectionStyle === "underlined" ? { borderBottom: `1px solid ${template.accentColor}40`, paddingBottom: 4 } : {}}>
        {section.title}
      </h2>

      {section.type === "SKILLS" ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item: Record<string, unknown>, i: number) => {
            const skillList = Array.isArray(item.skills) ? item.skills : [];
            return skillList.map((skill: string, j: number) => (
              <span key={`${i}-${j}`} className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-xs text-gray-700 dark:text-gray-300 rounded">
                {skill}
              </span>
            ));
          })}
        </div>
      ) : section.type === "EDUCATION" ? (
        <div className="space-y-2">
          {items.map((item: Record<string, unknown>, i: number) => (
            <div key={i}>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{(item.school as string) ?? ""}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{(item.degree as string) ?? ""}{item.field ? ` in ${item.field}` : ""}{item.year ? ` · ${item.year}` : ""}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item: Record<string, unknown>, i: number) => (
            <div key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{(item.role as string) ?? (item.company as string) ?? ""}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.company && item.role ? (item.company as string) + "" : ""}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">{(item.period as string) ?? ""}</p>
              </div>
              {item.description && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>}
              {item.bullets && Array.isArray(item.bullets) && item.bullets.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {item.bullets.filter((b: string) => b.trim()).map((b: string, j: number) => (
                    <li key={j} className="text-xs text-gray-600 dark:text-gray-400 pl-3 relative before:content-['•'] before:absolute before:left-0">{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
