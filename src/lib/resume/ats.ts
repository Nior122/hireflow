export interface AtsResult {
  overallScore: number;
  breakdown: { label: string; score: number; max: number; details: string[] }[];
  suggestions: { priority: "high" | "medium" | "low"; text: string }[];
}

const ACTION_VERBS = [
  "led", "managed", "developed", "implemented", "designed", "built", "created", "launched", "improved", "increased",
  "reduced", "achieved", "delivered", "optimized", "automated", "streamlined", "orchestrated", "spearheaded", "pioneered",
  "established", "revamped", "migrated", "architected", "facilitated", "coordinated", "supervised", "mentored", "trained",
  "analyzed", "resolved", "identified", "evaluated", "recommended", "collaborated", "negotiated", "presented",
];

const WEAK_PHRASES = [
  "responsible for", "duties included", "helped with", "assisted in", "worked on",
  "involved in", "participated in", "familiar with", "knowledge of", "experience with",
  "tasks included", "was able to", "helped to", "tried to",
];

export function analyzeAts(resumeText: string, sections: { type: string; content: any }[]): AtsResult {
  const text = resumeText.toLowerCase();
  const breakdown: AtsResult["breakdown"] = [];
  const suggestions: AtsResult["suggestions"] = [];

  // 1. Sections present
  const requiredSections = ["EXPERIENCE", "EDUCATION", "SKILLS"];
  const optionalSections = ["PROJECTS", "CERTIFICATIONS"];
  const foundTypes = new Set(sections.map(s => s.type));
  const requiredFound = requiredSections.filter(s => foundTypes.has(s)).length;
  const optionalFound = optionalSections.filter(s => foundTypes.has(s)).length;
  const sectionScore = Math.round((requiredFound / requiredSections.length) * 70 + (optionalFound / optionalSections.length) * 30);
  breakdown.push({ label: "Sections", score: sectionScore, max: 100, details: [`${requiredFound}/${requiredSections.length} required`, `${optionalFound}/${optionalSections.length} optional`] });

  if (requiredFound < requiredSections.length) {
    const missing = requiredSections.filter(s => !foundTypes.has(s));
    suggestions.push({ priority: "high", text: `Add missing sections: ${missing.join(", ")}` });
  }

  // 2. Length check
  const words = resumeText.split(/\s+/).length;
  const lengthScore = words >= 300 && words <= 800 ? 100 : words < 300 ? Math.round((words / 300) * 100) : Math.max(0, 100 - (words - 800) * 0.1);
  breakdown.push({ label: "Length", score: Math.round(lengthScore), max: 100, details: [`${words} words`, words < 300 ? "Too short" : words > 800 ? "Consider condensing" : "Good length"] });

  if (words < 200) suggestions.push({ priority: "high", text: "Resume is too short. Add more detail to your experience." });
  if (words > 800) suggestions.push({ priority: "medium", text: "Resume is long. Consider condensing to 1-2 pages." });

  // 3. Action verbs
  const actionVerbMatches = ACTION_VERBS.filter(v => text.includes(v)).length;
  const verbScore = Math.min(100, Math.round((actionVerbMatches / 8) * 100));
  breakdown.push({ label: "Action Verbs", score: verbScore, max: 100, details: [`${actionVerbMatches} action verbs found`] });
  if (actionVerbMatches < 5) suggestions.push({ priority: "medium", text: "Use more action verbs (led, developed, implemented, etc.) to describe your experience." });

  // 4. Weak phrases
  const weakMatches = WEAK_PHRASES.filter(p => text.includes(p));
  const weakScore = Math.max(0, 100 - weakMatches.length * 15);
  breakdown.push({ label: "Weak Phrases", score: weakScore, max: 100, details: weakMatches.length > 0 ? [`${weakMatches.length} weak phrases found: ${weakMatches.slice(0, 3).join(", ")}`] : ["No weak phrases found"] });
  if (weakMatches.length > 0) {
    suggestions.push({ priority: "high", text: `Remove weak phrases like "${weakMatches[0]}" — replace with specific achievements.` });
  }

  // 5. Contact info
  const hasEmail = text.includes("@");
  const hasPhone = /\+?\d[\d\s\-()]{7,}/.test(resumeText);
  const contactScore = (hasEmail ? 50 : 0) + (hasPhone ? 50 : 0);
  breakdown.push({ label: "Contact Info", score: contactScore, max: 100, details: [hasEmail ? "Email found" : "No email", hasPhone ? "Phone found" : "No phone"] });
  if (!hasEmail) suggestions.push({ priority: "high", text: "Add your email address." });

  // 6. Formatting
  const hasBullets = text.includes("•") || text.includes("-") || text.includes("✓");
  const numbersUsed = (resumeText.match(/\d+%|\$\d+|\d+ years?|\d+ people/g) || []).length;
  const formatScore = (hasBullets ? 40 : 0) + Math.min(60, numbersUsed * 15);
  breakdown.push({ label: "Formatting", score: Math.round(formatScore), max: 100, details: [hasBullets ? "Bullets used" : "No bullets", `${numbersUsed} quantified results`] });
  if (!hasBullets) suggestions.push({ priority: "medium", text: "Use bullet points for better readability." });
  if (numbersUsed < 3) suggestions.push({ priority: "medium", text: "Add more quantified achievements (percentages, dollar amounts, team sizes)." });

  // 7. Keywords (basic check for tech/modern terms)
  const modernTerms = ["api", "agile", "cross-functional", "stakeholder", "data-driven", "scalable", "cloud", "ci/cd", "microservices"];
  const foundModern = modernTerms.filter(t => text.includes(t)).length;
  const keywordScore = Math.min(100, Math.round((foundModern / 4) * 100));
  breakdown.push({ label: "Keywords", score: keywordScore, max: 100, details: [`${foundModern} modern keywords found`] });

  // Overall
  const weights = [0.15, 0.1, 0.15, 0.1, 0.1, 0.2, 0.2];
  const overallScore = Math.round(breakdown.reduce((s, b, i) => s + b.score * weights[i], 0));

  // Top suggestions
  suggestions.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return (prio[a.priority] ?? 1) - (prio[b.priority] ?? 1);
  });

  return { overallScore, breakdown, suggestions: suggestions.slice(0, 8) };
}

export function resumeToText(resume: { title?: string; summary?: string; sections?: { title: string; content: any }[] }): string {
  const parts: string[] = [];
  if (resume.title) parts.push(resume.title);
  if (resume.summary) parts.push(resume.summary);
  if (resume.sections) {
    for (const section of resume.sections) {
      parts.push(section.title);
      const content = section.content as any;
      if (content?.items && Array.isArray(content.items)) {
        for (const item of content.items) {
          if (typeof item === "string") parts.push(item);
          else if (item?.title) parts.push(item.title);
          if (item?.description) parts.push(item.description);
          if (item?.bullets && Array.isArray(item.bullets)) parts.push(...item.bullets);
          if (item?.skills && Array.isArray(item.skills)) parts.push(item.skills.join(", "));
        }
      }
    }
  }
  return parts.join("\n");
}
