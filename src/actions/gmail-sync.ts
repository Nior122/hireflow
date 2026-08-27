'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { GroqProvider } from "@/lib/ai/providers";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";
import { z } from "zod";
import { extractCareerMemory } from "@/actions/memory-service";
import { extractJobDetails, extractInterviewDetails } from "@/lib/ai/extraction";

// Internal helper to trigger memory extraction after sync (non-blocking)
async function extractAndStoreMemoryFromGmail(userId: string, text: string) {
  // We need server-side user context — re-use the userId directly since this is server-side
  const fakeReq = { createOrGetUser: async () => ({ id: userId }) };
  void fakeReq; // suppress unused var warning
  // Call memory service action with gmail source
  // We skip createOrGetUser here since we already have the userId
  await prisma.aIUserMemory.findMany({ where: { userId } }); // warm cache
  return extractCareerMemory(text, "GMAIL");
}


// ─── Types ─────────────────────────────────────────────────────────────────

const EmailClassificationSchema = z.object({
  category: z.enum([
    "JOB_OPPORTUNITY", "APPLICATIONS", "INTERVIEWS", "OFFERS", "REJECTIONS",
    "RECRUITERS", "NETWORKING", "CAREER", "IMPORTANT", "OTHER"
  ]),
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

type EmailClassification = z.infer<typeof EmailClassificationSchema>;

interface GmailSyncSummary {
  emailsProcessed: number;
  jobsDiscovered: number;
  applicationsDiscovered: number;
  interviewsDiscovered: number;
  rejectionsDiscovered: number;
  offersDiscovered: number;
  syncedAt: Date;
}

interface InboxEmailRecord {
  id: string;
  gmailMessageId: string;
  sender: string | null;
  senderEmail: string | null;
  subject: string | null;
  snippet: string | null;
  body: string | null;
  receivedAt: Date | null;
  isRead: boolean;
  category: string | null;
  confidence: number | null;
  jobRelated: boolean;
  applicationRelated: boolean;
  interviewRelated: boolean;
  rejectionRelated: boolean;
  offerRelated: boolean;
  urgency: number | null;
  importance: number | null;
  action: string | null;
  replyDraft: string | null;
  createdAt: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getValidGmailToken(userId: string): Promise<string | null> {
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!token) return null;

  if (token.expiryDate && new Date(token.expiryDate) < new Date(Date.now() + 60_000)) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;

      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: token.refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();
      if (!credentials.access_token) return null;

      await prisma.gmailToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token,
          expiryDate: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : new Date(Date.now() + 3_600_000),
        },
      });
      return credentials.access_token;
    } catch {
      return null;
    }
  }

  return token.accessToken;
}

function parseJsonFromLlm(raw: string): any {
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

function inferCompanyAndRole(
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

  // 1. Infer company from Subject regex patterns if missing
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

  // 2. Infer company from Sender Name
  if (!company && cleanSender) {
    const cleanSenderName = cleanSender.replace(/\b(Careers|Recruiting|Talent|HR|Team|Jobs|Notifications|No-Reply|Hiring)\b/gi, "").trim();
    if (cleanSenderName && cleanSenderName.length > 1) {
      company = cleanSenderName;
    }
  }

  // 3. Infer company from Sender Email Domain
  if (!company && cleanEmail && cleanEmail.includes("@")) {
    const domain = cleanEmail.split("@")[1]?.toLowerCase();
    const commonMailers = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "greenhouse.io", "lever.co", "workday.com", "ashbyhq.com", "smartrecruiters.com"];
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

  // Infer Role from Subject if missing
  if (!role && cleanSubject) {
    const roleMatch = cleanSubject.match(/(?:for|role|position|as)\s+([A-Za-z0-9\s/-]+?)(?:\s+at|\s+with|\s*[-–—|:]|$)/i);
    if (roleMatch) {
      role = roleMatch[1].trim();
    }
  }
  if (!role) role = "Software Role";

  return { company, role };
}

function deterministicClassify(text: string): EmailClassification {
  text = text.toLowerCase();

  let partial: any = { category: "OTHER", confidence: 0.5 };

  if (/interview|schedule|phone screen|video call|coding challenge|assessment|coderpad|hackerrank|availability|meet with/i.test(text)) {
    partial = { category: "INTERVIEWS", confidence: 0.8, interviewRelated: true, jobRelated: true };
  } else if (/unfortunately|not moving forward|not selected|not a fit|other candidates|regret to inform|position has been filled|pursuing other|decision on your/i.test(text)) {
    partial = { category: "REJECTIONS", confidence: 0.85, rejectionRelated: true, jobRelated: true };
  } else if (/pleased to offer|offer letter|compensation package|employment offer|congratulations/i.test(text)) {
    partial = { category: "OFFERS", confidence: 0.9, offerRelated: true, jobRelated: true };
  } else if (/thank you for applying|application received|we received|application update|application status|confirmation|submission|applied/i.test(text)) {
    partial = { category: "APPLICATIONS", confidence: 0.85, applicationRelated: true, jobRelated: true };
  } else if (/job opportunity|open position|hiring|exciting role|we are looking for|position available|join our team|engineer|developer|architect/i.test(text)) {
    partial = { category: "JOB_OPPORTUNITY", confidence: 0.75, jobRelated: true };
  } else if (/recruiter|talent acquisition|sourcing|headhunter|outreach|saw your profile|saw your linkedin/i.test(text)) {
    partial = { category: "RECRUITERS", confidence: 0.75, jobRelated: true };
  } else if (/deadline|action required|important/i.test(text)) {
    partial = { category: "IMPORTANT", confidence: 0.65, jobRelated: true };
  }

  return EmailClassificationSchema.parse(partial);
}

async function aiClassifyEmail(
  subject: string,
  sender: string,
  snippet: string,
  body: string
): Promise<EmailClassification> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return deterministicClassify(`${subject} ${snippet}`);

  const limitedBody = body ? body.substring(0, 1500) : "";

  const prompt = `You are a personal AI career assistant. Classify this email and extract career-related information.
Do NOT invent missing information. If company or role cannot be determined, return null.

Email:
Subject: ${subject}
From: ${sender}
Snippet: ${snippet}
Body:
${limitedBody}

Respond ONLY with a JSON object matching this schema (no markdown, no extra text):
{
  "category": "JOB_OPPORTUNITY|APPLICATIONS|INTERVIEWS|OFFERS|REJECTIONS|RECRUITERS|NETWORKING|CAREER|IMPORTANT|OTHER",
  "confidence": 0.0-1.0,
  "jobRelated": boolean,
  "applicationRelated": boolean,
  "interviewRelated": boolean,
  "rejectionRelated": boolean,
  "offerRelated": boolean,
  "company": "company name if found, else null",
  "role": "job title if found, else null",
  "summary": "1-sentence summary",
  "actionRequired": boolean,
  "action": "Recommended next action or null",
  "urgency": 0.0-1.0,
  "importance": 0.0-1.0,
  "replyDraft": "Polite draft if actionRequired else null"
}`;

  try {
    const provider = new GroqProvider();
    const response = await provider.chat([
      { role: "user", content: prompt }
    ], { temperature: 0.1, maxTokens: 512 });

    const parsed = parseJsonFromLlm(response);
    return EmailClassificationSchema.parse(parsed);
  } catch (err) {
    console.error("[aiClassifyEmail] LLM parsing error, using fallback:", err);
    return deterministicClassify(`${subject} ${snippet}`);
  }
}

function safeBase64UrlDecode(str: string): string {
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

// Extract body text recursively from Gmail payload parts
function extractEmailBody(payload: any): string {
  if (!payload) return "";
  let body = "";

  if (payload.body?.data) {
    body += safeBase64UrlDecode(payload.body.data) + "\n";
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.body?.data) {
        body += safeBase64UrlDecode(part.body.data) + "\n";
      }
      if (part.parts) {
        body += extractEmailBody(part) + "\n";
      }
    }
  }

  // Strip HTML tags for clean AI context
  return body.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
             .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
             .replace(/<[^>]*>?/gm, ' ')
             .replace(/\s+/g, ' ')
             .trim();
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
  return { name: raw, email: raw };
}

// ─── Public Server Actions ──────────────────────────────────────────────────

export async function syncGmailInbox(): Promise<ActionResponse<GmailSyncSummary>> {
  try {
    const user = await createOrGetUser();
    const accessToken = await getValidGmailToken(user.id);
    if (!accessToken) {
      return { success: false, error: "Gmail not connected. Please connect Gmail in Settings first." };
    }

    // Fetch latest 100 messages across the user's inbox
    const listRes = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=100",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      console.error("[gmail-sync] list failed:", listRes.status, err);
      return { success: false, error: "Failed to fetch Gmail messages. Please reconnect Gmail." };
    }

    const listData = await listRes.json();
    const messageList: { id: string }[] = listData.messages ?? [];

    let emailsProcessed = 0;
    let jobsDiscovered = 0;
    let applicationsDiscovered = 0;
    let interviewsDiscovered = 0;
    let rejectionsDiscovered = 0;
    let offersDiscovered = 0;

    for (const msg of messageList) {
      try {
        // Fetch full message to get the actual body
        const metaRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!metaRes.ok) continue;

        const meta = await metaRes.json();
        const headers: { name: string; value: string }[] = meta.payload?.headers ?? [];
        const getHeader = (name: string) => headers.find(h => h.name === name)?.value ?? "";

        const subject = getHeader("Subject");
        const fromRaw = getHeader("From");
        const to = getHeader("To");
        const dateStr = getHeader("Date");

        const { name: sender, email: senderEmail } = parseEmailAddress(fromRaw);
        const snippet: string = meta.snippet ?? "";
        const labelIds: string[] = meta.labelIds ?? [];
        const isRead = !labelIds.includes("UNREAD");

        let receivedAt: Date | null = null;
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) receivedAt = parsed;
        }
        if (!receivedAt && meta.internalDate) {
          receivedAt = new Date(parseInt(meta.internalDate));
        }

        // Extract the actual email body
        const bodyText = extractEmailBody(meta.payload);
        const limitedBody = bodyText.slice(0, 2500);

        // AI classify (using subject, snippet, and actual body)
        const classification = await aiClassifyEmail(subject, fromRaw, snippet, limitedBody);

        // Upsert EmailMessage
        const savedEmail = await prisma.emailMessage.upsert({
          where: { gmailMessageId: msg.id },
          create: {
            userId: user.id,
            gmailMessageId: msg.id,
            gmailThreadId: meta.threadId ?? null,
            sender: sender || null,
            senderEmail: senderEmail || null,
            recipients: to || null,
            subject: subject || null,
            snippet: snippet.slice(0, 500) || null,
            body: limitedBody || null,
            receivedAt,
            isRead,
            labels: labelIds,
            category: classification.category,
            confidence: classification.confidence,
            jobRelated: classification.jobRelated,
            applicationRelated: classification.applicationRelated,
            interviewRelated: classification.interviewRelated,
            rejectionRelated: classification.rejectionRelated,
            offerRelated: classification.offerRelated,
            urgency: classification.urgency,
            importance: classification.importance,
            action: classification.action ?? null,
            replyDraft: classification.replyDraft ?? null,
            jobApplicationId: null,
          },
          update: {
            isRead,
            labels: labelIds,
            // Only update body if we didn't have one before
            ...(limitedBody ? { body: limitedBody } : {}),
          },
        });

        emailsProcessed++;

        // ─── Entity Extraction Pipeline ──────────────────────────────────
        let linkedJobAppId: string | null = null;

        const { company: inferredCompany, role: inferredRole } = inferCompanyAndRole(
          classification.company,
          classification.role,
          subject,
          sender,
          senderEmail
        );

        console.log(`[GMAIL SYNC] msgId=${msg.id} | category=${classification.category} | company="${inferredCompany}" | role="${inferredRole}" | subject="${subject}"`);

        if (classification.category === "JOB_OPPORTUNITY") {
          const jobDetails = await extractJobDetails(subject, snippet);
          const company = jobDetails?.company || inferredCompany;
          const title = jobDetails?.title || inferredRole;

          if (company && title) {
            const existingApp = await prisma.jobApplication.findFirst({
              where: {
                userId: user.id,
                company: { equals: company, mode: "insensitive" },
                role: { equals: title, mode: "insensitive" },
              }
            });

            if (existingApp) {
              linkedJobAppId = existingApp.id;
            } else {
              const existingDiscovered = await prisma.discoveredJob.findFirst({
                where: {
                  userId: user.id,
                  company: { equals: company, mode: "insensitive" },
                  title: { equals: title, mode: "insensitive" },
                },
              });

              if (!existingDiscovered) {
                await prisma.discoveredJob.create({
                  data: {
                    userId: user.id,
                    sourceEmailId: savedEmail.id,
                    title,
                    company,
                    location: jobDetails?.location || null,
                    employmentType: jobDetails?.employmentType || null,
                    remoteType: jobDetails?.remoteType || null,
                    salaryMin: jobDetails?.salaryMin || null,
                    salaryMax: jobDetails?.salaryMax || null,
                    salaryCurrency: jobDetails?.salaryCurrency || null,
                    status: "NEW",
                  },
                });
                jobsDiscovered++;
              }
            }
          }
        } else if (classification.category === "APPLICATIONS") {
          const company = inferredCompany;
          const role = inferredRole;

          let existingApp = await prisma.jobApplication.findFirst({
            where: {
              userId: user.id,
              company: { equals: company, mode: "insensitive" },
            }
          });

          if (!existingApp) {
            existingApp = await prisma.jobApplication.create({
              data: {
                userId: user.id,
                company,
                role: role || "Software Role",
                status: "APPLIED",
                source: "Gmail Sync",
                sourceEmailId: savedEmail.id,
              }
            });
            applicationsDiscovered++;
          }
          linkedJobAppId = existingApp.id;
        } else if (classification.category === "INTERVIEWS") {
          const interviewDetails = await extractInterviewDetails(subject, snippet);
          const company = inferredCompany;
          const title = inferredRole;

          let existingApp = await prisma.jobApplication.findFirst({
            where: {
              userId: user.id,
              company: { equals: company, mode: "insensitive" },
            },
            orderBy: { createdAt: 'desc' }
          });

          if (existingApp) {
            await prisma.jobApplication.update({
              where: { id: existingApp.id },
              data: { status: "INTERVIEW" }
            });
          } else {
            existingApp = await prisma.jobApplication.create({
              data: {
                userId: user.id,
                company,
                role: title,
                status: "INTERVIEW",
                source: "Gmail Sync",
                sourceEmailId: savedEmail.id,
              }
            });
            applicationsDiscovered++;
          }
          linkedJobAppId = existingApp.id;

          const scheduledAt = interviewDetails?.date ? new Date(interviewDetails.date) : new Date(Date.now() + 86400000 * 2);
          if (!isNaN(scheduledAt.getTime())) {
            await prisma.interview.create({
              data: {
                userId: user.id,
                company,
                position: title,
                scheduledAt,
                location: interviewDetails?.location || null,
                meetingLink: interviewDetails?.meetingUrl || null,
                notes: interviewDetails?.instructions || null,
                applicationId: existingApp.id,
              }
            });
            interviewsDiscovered++;
          }
        } else if (classification.category === "REJECTIONS") {
          const company = inferredCompany;
          const existingApp = await prisma.jobApplication.findFirst({
            where: {
              userId: user.id,
              company: { equals: company, mode: "insensitive" },
            }
          });
          if (existingApp) {
            await prisma.jobApplication.update({
              where: { id: existingApp.id },
              data: { status: "REJECTED" }
            });
            linkedJobAppId = existingApp.id;
            rejectionsDiscovered++;
          }
        } else if (classification.category === "OFFERS") {
          const company = inferredCompany;
          const role = inferredRole;

          let existingApp = await prisma.jobApplication.findFirst({
            where: {
              userId: user.id,
              company: { equals: company, mode: "insensitive" },
            }
          });

          if (existingApp) {
            await prisma.jobApplication.update({
              where: { id: existingApp.id },
              data: { status: "OFFER" }
            });
          } else {
            existingApp = await prisma.jobApplication.create({
              data: {
                userId: user.id,
                company,
                role: role || "Job Role",
                status: "OFFER",
                source: "Gmail Sync",
                sourceEmailId: savedEmail.id,
              }
            });
            applicationsDiscovered++;
          }
          linkedJobAppId = existingApp.id;
          offersDiscovered++;
        }

        // ─── Recruiter Contact Extraction ──────────────────────────────────
        if (
          classification.category === "RECRUITERS" &&
          senderEmail
        ) {
          const existingContact = await prisma.recruiterContact.findFirst({
            where: {
              userId: user.id,
              email: { equals: senderEmail, mode: "insensitive" },
            },
          });

          if (existingContact) {
            const sourceIds = existingContact.sourceEmailIds.includes(savedEmail.id)
              ? existingContact.sourceEmailIds
              : [...existingContact.sourceEmailIds, savedEmail.id];
            await prisma.recruiterContact.update({
              where: { id: existingContact.id },
              data: {
                communicationCount: { increment: 1 },
                lastContactedAt: receivedAt ?? new Date(),
                sourceEmailIds: sourceIds,
              },
            });
          } else {
            await prisma.recruiterContact.create({
              data: {
                userId: user.id,
                name: sender || "Unknown",
                email: senderEmail,
                company: classification.company?.trim() || null,
                role: classification.role?.trim() || null,
                relationship: "RECRUITER",
                lastContactedAt: receivedAt ?? new Date(),
                communicationCount: 1,
                sourceEmailIds: [savedEmail.id],
              },
            });
          }
        }

        // ─── Career Reminder / Deadline Extraction ───────────────────────────
        if (classification.category === "INTERVIEWS" || classification.category === "IMPORTANT") {
          // Create a career reminder for interviews and important deadlines
          const interviewDetails = classification.category === "INTERVIEWS"
            ? await extractInterviewDetails(subject, snippet).catch(() => null)
            : null;
          const deadlineDate = interviewDetails?.date ? new Date(interviewDetails.date) : null;

          if (deadlineDate && !isNaN(deadlineDate.getTime())) {
            const reminderType = classification.category === "IMPORTANT" ? "ASSESSMENT_DEADLINE" : "INTERVIEW_DATE";
            const existingReminder = await prisma.careerReminder.findFirst({
              where: {
                userId: user.id,
                sourceEmailId: savedEmail.id,
              },
            });

            if (!existingReminder) {
              await prisma.careerReminder.create({
                data: {
                  userId: user.id,
                  type: reminderType,
                  date: deadlineDate,
                  confidence: classification.confidence,
                  sourceEmailId: savedEmail.id,
                  title: classification.summary || subject || "Career deadline",
                },
              });
            }
          }
        }

        if (linkedJobAppId) {
          await prisma.emailMessage.update({
            where: { id: savedEmail.id },
            data: { jobApplicationId: linkedJobAppId }
          });
        }
      } catch (msgErr) {
        // Log but continue processing remaining messages
        console.error("[gmail-sync] error processing message:", msg.id, msgErr instanceof Error ? msgErr.message : "unknown");
      }
    }

    // Update sync timestamp
    await prisma.gmailToken.updateMany({
      where: { userId: user.id },
      data: { lastSyncedAt: new Date() },
    });

    // ─── Memory Extraction ────────────────────────────────────────────────────
    // Asynchronously extract career signals from job-related emails
    // e.g. "Recruiter from Google emailed about a Senior React role" → skills, companies
    try {
      const jobEmails = await prisma.emailMessage.findMany({
        where: { userId: user.id, jobRelated: true },
        orderBy: { receivedAt: "desc" },
        take: 20,
        select: { subject: true, sender: true, snippet: true, category: true },
      });

      if (jobEmails.length > 0) {
        const memoryText = jobEmails
          .map(e => `[${e.category}] From: ${e.sender ?? ""} | ${e.subject ?? ""} | ${e.snippet ?? ""}`)
          .join("\n");

        // Fire-and-forget — don't fail sync if memory extraction fails
        extractAndStoreMemoryFromGmail(user.id, memoryText).catch(err =>
          console.error("[gmail-sync] memory extraction error:", err)
        );
      }
    } catch (memErr) {
      console.error("[gmail-sync] memory extraction setup error:", memErr);
    }

    revalidatePath("/dashboard");
    return {
      success: true,
      data: {
        emailsProcessed,
        jobsDiscovered,
        applicationsDiscovered,
        interviewsDiscovered,
        rejectionsDiscovered,
        offersDiscovered,
        syncedAt: new Date()
      },
    };
  } catch (err) {
    console.error("[gmail-sync] fatal error:", err instanceof Error ? err.message : "unknown");
    return { success: false, error: "Unable to sync Gmail right now. Please try again." };
  }
}

export async function getInboxStats(): Promise<ActionResponse<Record<string, number>>> {
  try {
    const user = await createOrGetUser();
    
    const stats = await prisma.emailMessage.groupBy({
      by: ['category'],
      where: { userId: user.id },
      _count: true,
    });
    
    const allMailCount = await prisma.emailMessage.count({ where: { userId: user.id } });
    
    const result: Record<string, number> = {
      ALL: allMailCount,
      JOB_OPPORTUNITY: 0,
      APPLICATIONS: 0,
      INTERVIEWS: 0,
      OFFERS: 0,
      REJECTIONS: 0,
      RECRUITERS: 0,
      NETWORKING: 0,
      CAREER: 0,
      IMPORTANT: 0,
      OTHER: 0,
    };
    
    for (const stat of stats) {
      if (stat.category && stat.category in result) {
        result[stat.category] = stat._count;
      } else if (stat.category) {
        // Fallback for old categories if any exist
        result.OTHER += stat._count;
      }
    }
    
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: "Failed to load stats." };
  }
}

export async function getInboxEmails(options?: {
  category?: string;
  page?: number;
  pageSize?: number;
  jobRelatedOnly?: boolean;
}): Promise<ActionResponse<{ emails: InboxEmailRecord[]; total: number; hasMore: boolean }>> {
  try {
    const user = await createOrGetUser();
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 25;
    const skip = (page - 1) * pageSize;

    const where = {
      userId: user.id,
      ...(options?.category && options.category !== 'ALL' ? { category: options.category } : {}),
      ...(options?.jobRelatedOnly ? { jobRelated: true } : {}),
    };

    const [emails, total] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.emailMessage.count({ where }),
    ]);

    return {
      success: true,
      data: {
        emails: emails as InboxEmailRecord[],
        total,
        hasMore: skip + emails.length < total,
      },
    };
  } catch {
    return { success: false, error: "Failed to load inbox emails." };
  }
}

export async function getDiscoveredJobs(): Promise<ActionResponse<{
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: string | null;
  remoteType: string | null;
  status: string;
  createdAt: Date;
  sourceEmail?: { subject: string | null; sender: string | null; receivedAt: Date | null } | null;
}[]>> {
  try {
    const user = await createOrGetUser();
    const jobs = await prisma.discoveredJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        sourceEmail: {
          select: { subject: true, sender: true, receivedAt: true },
        },
      },
    });
    return { success: true, data: jobs };
  } catch {
    return { success: false, error: "Failed to load discovered jobs." };
  }
}

export async function updateDiscoveredJobStatus(
  jobId: string,
  status: "SAVED" | "DISMISSED" | "APPLIED" | "NEW"
): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const updated = await prisma.discoveredJob.updateMany({
      where: { id: jobId, userId: user.id },
      data: { status },
    });
    if (updated.count === 0) return { success: false, error: "Job not found." };
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update job status." };
  }
}

export async function getGmailSyncStatus(): Promise<ActionResponse<{
  connected: boolean;
  lastSyncedAt: Date | null;
  emailCount: number;
  jobsDiscovered: number;
}>> {
  try {
    const user = await createOrGetUser();
    const [token, emailCount, jobsDiscovered] = await Promise.all([
      prisma.gmailToken.findUnique({ where: { userId: user.id }, select: { lastSyncedAt: true } }),
      prisma.emailMessage.count({ where: { userId: user.id } }),
      prisma.discoveredJob.count({ where: { userId: user.id } }),
    ]);

    return {
      success: true,
      data: {
        connected: !!token,
        lastSyncedAt: token?.lastSyncedAt ?? null,
        emailCount,
        jobsDiscovered,
      },
    };
  } catch {
    return { success: false, error: "Failed to get sync status." };
  }
}
