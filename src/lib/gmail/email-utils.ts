import { z } from "zod";

export const EMAIL_CATEGORIES = [
  "JOB_OPPORTUNITY",
  "APPLICATIONS",
  "INTERVIEWS",
  "OFFERS",
  "REJECTIONS",
  "RECRUITERS",
  "NETWORKING",
  "CAREER",
  "IMPORTANT",
  "OTHER",
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const EmailClassificationSchema = z.object({
  category: z.enum(EMAIL_CATEGORIES),
  confidence: z.number().min(0).max(1),
  jobRelated: z.boolean().default(false),
  applicationRelated: z.boolean().default(false),
  interviewRelated: z.boolean().default(false),
  rejectionRelated: z.boolean().default(false),
  offerRelated: z.boolean().default(false),
  company: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  summary: z.string().optional(),
  actionRequired: z.boolean().default(false),
  action: z.string().nullable().optional(),
  urgency: z.number().min(0).max(1).default(0),
  importance: z.number().min(0).max(1).default(0),
  replyDraft: z.string().nullable().optional(),
});

export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

const CLASSIFICATION_DEFAULTS: EmailClassification = {
  category: "OTHER",
  confidence: 0.5,
  jobRelated: false,
  applicationRelated: false,
  interviewRelated: false,
  rejectionRelated: false,
  offerRelated: false,
  company: null,
  role: null,
  summary: undefined,
  actionRequired: false,
  action: null,
  urgency: 0,
  importance: 0,
  replyDraft: null,
};

function withCategoryFlags(result: EmailClassification): EmailClassification {
  const category = result.category;
  return {
    ...result,
    jobRelated:
      result.jobRelated ||
      category === "JOB_OPPORTUNITY" ||
      category === "APPLICATIONS" ||
      category === "INTERVIEWS" ||
      category === "OFFERS" ||
      category === "REJECTIONS" ||
      category === "RECRUITERS" ||
      category === "CAREER",
    applicationRelated: result.applicationRelated || category === "APPLICATIONS",
    interviewRelated: result.interviewRelated || category === "INTERVIEWS",
    rejectionRelated: result.rejectionRelated || category === "REJECTIONS",
    offerRelated: result.offerRelated || category === "OFFERS",
  };
}

export function safeParseClassification(input: unknown): EmailClassification {
  const parsed = EmailClassificationSchema.safeParse(input);
  if (parsed.success) return withCategoryFlags(parsed.data);

  if (input && typeof input === "object") {
    const raw = input as Record<string, unknown>;
    const category = EMAIL_CATEGORIES.includes(raw.category as EmailCategory)
      ? (raw.category as EmailCategory)
      : "OTHER";
    const num = (value: unknown, fallback: number) => {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
    };
    const bool = (value: unknown) => value === true;
    return withCategoryFlags({
      ...CLASSIFICATION_DEFAULTS,
      category,
      confidence: num(raw.confidence, 0.5),
      jobRelated: bool(raw.jobRelated),
      applicationRelated: bool(raw.applicationRelated),
      interviewRelated: bool(raw.interviewRelated),
      rejectionRelated: bool(raw.rejectionRelated),
      offerRelated: bool(raw.offerRelated),
      company: typeof raw.company === "string" ? raw.company : null,
      role: typeof raw.role === "string" ? raw.role : null,
      summary: typeof raw.summary === "string" ? raw.summary : undefined,
      actionRequired: bool(raw.actionRequired),
      action: typeof raw.action === "string" ? raw.action : null,
      urgency: num(raw.urgency, 0),
      importance: num(raw.importance, 0),
      replyDraft: typeof raw.replyDraft === "string" ? raw.replyDraft : null,
    });
  }

  return { ...CLASSIFICATION_DEFAULTS };
}

export function parseJsonFromLlm(raw: string): unknown {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

export function inferCompanyAndRole(
  extractedCompany?: string | null,
  extractedRole?: string | null,
  subject?: string | null,
  senderName?: string | null,
  senderEmail?: string | null
): { company: string; role: string } {
  let company = extractedCompany?.trim() || "";
  let role = extractedRole?.trim() || "";

  const cleanSubject = subject || "";
  const cleanSender = senderName || "";
  const cleanEmail = senderEmail || "";

  if (!company) {
    const atMatch = cleanSubject.match(/(?:at|with|for)\s+([A-Z][A-Za-z0-9\s.&'-]+)/);
    if (atMatch) {
      company = atMatch[1].split(/[-–—|:]/)[0].trim();
    } else {
      const dashMatch = cleanSubject.match(/^([A-Z][A-Za-z0-9\s.&'-]+)\s*[-–—|:]/);
      if (dashMatch && !/thank|application|interview|rejection|status|your|job/i.test(dashMatch[1])) {
        company = dashMatch[1].trim();
      }
    }
  }

  if (!company && cleanSender) {
    const cleanSenderName = cleanSender.replace(/\b(Careers|Recruiting|Talent|HR|Team|Jobs|Notifications|No-Reply|Hiring)\b/gi, "").trim();
    if (cleanSenderName && cleanSenderName.length > 1) {
      company = cleanSenderName;
    }
  }

  if (!company && cleanEmail && cleanEmail.includes("@")) {
    const domain = cleanEmail.split("@")[1]?.toLowerCase();
    const commonMailers = [
      "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
      "greenhouse.io", "lever.co", "workday.com", "ashbyhq.com", "smartrecruiters.com",
    ];
    if (domain && !commonMailers.includes(domain)) {
      const domainName = domain.split(".")[0];
      if (domainName) {
        company = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    }
  }

  if (!company) {
    company = cleanSender || "Company";
  }

  if (!role && cleanSubject) {
    const roleMatch = cleanSubject.match(/(?:for|role|position|as)\s+([A-Za-z0-9\s/-]+?)(?:\s+at|\s+with|\s*[-–—|:]|$)/i);
    if (roleMatch) {
      role = roleMatch[1].trim();
    }
  }
  if (!role) role = "Software Role";

  return { company, role };
}

export function deterministicClassify(text: string): EmailClassification {
  const haystack = text.toLowerCase();

  let partial: Record<string, unknown> = { category: "OTHER", confidence: 0.5 };

  if (/interview|schedule|phone screen|video call|coding challenge|assessment|coderpad|hackerrank|availability|meet with/i.test(haystack)) {
    partial = { category: "INTERVIEWS", confidence: 0.8, interviewRelated: true, jobRelated: true };
  } else if (/unfortunately|not moving forward|not selected|not a fit|other candidates|regret to inform|position has been filled|pursuing other|decision on your/i.test(haystack)) {
    partial = { category: "REJECTIONS", confidence: 0.85, rejectionRelated: true, jobRelated: true };
  } else if (/pleased to offer|offer letter|compensation package|employment offer|congratulations/i.test(haystack)) {
    partial = { category: "OFFERS", confidence: 0.9, offerRelated: true, jobRelated: true };
  } else if (/thank you for applying|application received|we received|application update|application status|confirmation|submission|applied/i.test(haystack)) {
    partial = { category: "APPLICATIONS", confidence: 0.85, applicationRelated: true, jobRelated: true };
  } else if (/job opportunity|open position|hiring|exciting role|we are looking for|position available|join our team|engineer|developer|architect/i.test(haystack)) {
    partial = { category: "JOB_OPPORTUNITY", confidence: 0.75, jobRelated: true };
  } else if (/recruiter|talent acquisition|sourcing|headhunter|outreach|saw your profile|saw your linkedin/i.test(haystack)) {
    partial = { category: "RECRUITERS", confidence: 0.75, jobRelated: true };
  } else if (/deadline|action required|important/i.test(haystack)) {
    partial = { category: "IMPORTANT", confidence: 0.65, jobRelated: true };
  }

  return safeParseClassification(partial);
}

export function safeBase64UrlDecode(str: string): string {
  if (!str) return "";
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export function extractEmailBody(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const node = payload as { body?: { data?: string }; parts?: unknown[] };
  let body = "";

  if (node.body?.data) {
    body += safeBase64UrlDecode(node.body.data) + "\n";
  }

  if (Array.isArray(node.parts)) {
    for (const part of node.parts) {
      body += extractEmailBody(part) + "\n";
    }
  }

  return body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: raw, email: raw };
}

export function shouldUseIncrementalSync(options: {
  historyId?: string | null;
  storedEmailCount: number;
  forceFullSync?: boolean;
}): boolean {
  if (options.forceFullSync) return false;
  if (!options.historyId) return false;
  // A previous sync that saved a history cursor without actually storing
  // emails must not skip the mailbox — fall back to a full inbox list.
  if (options.storedEmailCount <= 0) return false;
  return true;
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
