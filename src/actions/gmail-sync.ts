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
    "JOB_OPPORTUNITY", "APPLICATION_CONFIRMATION", "APPLICATION_UPDATE", "RECRUITER_CONTACT", "EMPLOYER_CONTACT",
    "INTERVIEW_INVITATION", "INTERVIEW_RESCHEDULE", "INTERVIEW_REMINDER", "REJECTION", "OFFER",
    "FOLLOW_UP", "CAREER_EVENT", "ASSESSMENT", "NETWORKING", "NEWSLETTER", "PROMOTION", "PERSONAL", "OTHER",
  ]),
  confidence: z.number().min(0).max(1),
  jobRelated: z.boolean(),
  applicationRelated: z.boolean(),
  interviewRelated: z.boolean(),
  rejectionRelated: z.boolean(),
  offerRelated: z.boolean(),
  company: z.string().optional(),
  role: z.string().optional(),
  summary: z.string().optional(),
  actionRequired: z.boolean().default(false),
  action: z.string().optional(),
  urgency: z.number().min(0).max(1).default(0),
  importance: z.number().min(0).max(1).default(0),
  replyDraft: z.string().optional(),
});

type EmailClassification = z.infer<typeof EmailClassificationSchema>;

interface GmailSyncSummary {
  emailsProcessed: number;
  jobsDiscovered: number;
  syncedAt: Date;
}

interface InboxEmailRecord {
  id: string;
  gmailMessageId: string;
  sender: string | null;
  senderEmail: string | null;
  subject: string | null;
  snippet: string | null;
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

function deterministicClassify(subject: string, snippet: string): EmailClassification {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (/interview|schedule a call|phone screen|video call|hiring manager|we'd like to meet/.test(text)) {
    return { category: "INTERVIEW_INVITATION", confidence: 0.75, jobRelated: true, applicationRelated: false, interviewRelated: true, rejectionRelated: false, offerRelated: false, actionRequired: true, urgency: 0.8, importance: 0.9 };
  }
  if (/unfortunately|not moving forward|not selected|not a fit|other candidates|wish you the best/.test(text)) {
    return { category: "REJECTION", confidence: 0.8, jobRelated: true, applicationRelated: false, interviewRelated: false, rejectionRelated: true, offerRelated: false, actionRequired: false, urgency: 0.3, importance: 0.7 };
  }
  if (/pleased to offer|offer letter|compensation package|start date|sign your offer/.test(text)) {
    return { category: "OFFER", confidence: 0.85, jobRelated: true, applicationRelated: false, interviewRelated: false, rejectionRelated: false, offerRelated: true, actionRequired: true, urgency: 0.9, importance: 1.0 };
  }
  if (/thank you for applying|application received|application confirmed|we received your/.test(text)) {
    return { category: "APPLICATION_CONFIRMATION", confidence: 0.8, jobRelated: true, applicationRelated: true, interviewRelated: false, rejectionRelated: false, offerRelated: false, actionRequired: false, urgency: 0.2, importance: 0.5 };
  }
  if (/job opportunity|open position|hiring|we are looking for|exciting role|are you interested/.test(text)) {
    return { category: "JOB_OPPORTUNITY", confidence: 0.7, jobRelated: true, applicationRelated: false, interviewRelated: false, rejectionRelated: false, offerRelated: false, actionRequired: true, urgency: 0.6, importance: 0.6 };
  }
  if (/recruiter|talent acquisition|sourcing|linkedin recruiter|i came across your profile/.test(text)) {
    return { category: "RECRUITER_CONTACT", confidence: 0.7, jobRelated: true, applicationRelated: false, interviewRelated: false, rejectionRelated: false, offerRelated: false, actionRequired: true, urgency: 0.5, importance: 0.6 };
  }
  if (/follow.?up|checking in|wanted to follow|any update/.test(text)) {
    return { category: "FOLLOW_UP", confidence: 0.65, jobRelated: true, applicationRelated: false, interviewRelated: false, rejectionRelated: false, offerRelated: false, actionRequired: true, urgency: 0.7, importance: 0.5 };
  }

  return { category: "OTHER", confidence: 0.5, jobRelated: false, applicationRelated: false, interviewRelated: false, rejectionRelated: false, offerRelated: false, actionRequired: false, urgency: 0.1, importance: 0.1 };
}

async function aiClassifyEmail(
  subject: string,
  sender: string,
  snippet: string
): Promise<EmailClassification> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return deterministicClassify(subject, snippet);

  const prompt = `You are an email classifier for a job search assistant. Classify this email and extract job-related information.

Email:
Subject: ${subject}
From: ${sender}
Snippet: ${snippet}

Respond ONLY with a JSON object matching this schema (no markdown, no extra text):
{
  "category": "JOB_OPPORTUNITY|APPLICATION_CONFIRMATION|APPLICATION_UPDATE|RECRUITER_CONTACT|EMPLOYER_CONTACT|INTERVIEW_INVITATION|INTERVIEW_RESCHEDULE|INTERVIEW_REMINDER|REJECTION|OFFER|FOLLOW_UP|CAREER_EVENT|ASSESSMENT|NETWORKING|NEWSLETTER|PROMOTION|PERSONAL|OTHER",
  "confidence": 0.0-1.0,
  "jobRelated": boolean,
  "applicationRelated": boolean,
  "interviewRelated": boolean,
  "rejectionRelated": boolean,
  "offerRelated": boolean,
  "company": "company name if found",
  "role": "job title if found",
  "summary": "1-sentence summary",
  "actionRequired": boolean,
  "action": "Recommended next action (e.g. 'Prepare for interview', 'Reply to recruiter') or null",
  "urgency": 0.0-1.0,
  "importance": 0.0-1.0,
  "replyDraft": "Generate a short polite email reply if actionRequired is true and it makes sense, otherwise null"
}`;

  try {
    const provider = new GroqProvider();
    const response = await provider.chat([
      { role: "user", content: prompt }
    ], { temperature: 0.1, maxTokens: 512 });

    const parsed = JSON.parse(response.trim());
    return EmailClassificationSchema.parse(parsed);
  } catch {
    return deterministicClassify(subject, snippet);
  }
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

    // Fetch latest 50 messages (metadata only first for efficiency)
    const listRes = await fetch(
      "https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=newer_than:30d",
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

    for (const msg of messageList) {
      try {
        // Fetch metadata for each message
        const metaRes = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
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

        // AI classify (fast, only subject + snippet to minimize token usage)
        const classification = await aiClassifyEmail(subject, fromRaw, snippet);

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
            jobApplicationId: null, // Default to null, we will update it below if we find a match
          },
          update: {
            isRead,
            labels: labelIds,
            // Don't overwrite AI classification if already done
          },
        });

        emailsProcessed++;

        // Job Discovery & Normalization
        let linkedJobAppId: string | null = null;

        if (classification.category === "JOB_OPPORTUNITY") {
          const jobDetails = await extractJobDetails(subject, snippet);
          const company = jobDetails?.company || classification.company?.trim() || "";
          const title = jobDetails?.title || classification.role?.trim() || "";

          if (company && title) {
            // 1. Check if an active JobApplication already exists
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
              // 2. No active app found, check if DiscoveredJob exists
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
        } else if (classification.category === "INTERVIEW_INVITATION" || classification.category === "INTERVIEW_RESCHEDULE") {
          const interviewDetails = await extractInterviewDetails(subject, snippet);
          const company = classification.company?.trim() || "Unknown Company";
          const title = classification.role?.trim() || "Unknown Role";
          
          if (interviewDetails && interviewDetails.date) {
            const scheduledAt = new Date(interviewDetails.date);
            if (!isNaN(scheduledAt.getTime())) {
              // Try to link to an application
              const existingApp = await prisma.jobApplication.findFirst({
                where: {
                  userId: user.id,
                  company: { equals: company, mode: "insensitive" },
                },
                orderBy: { createdAt: 'desc' }
              });

              if (existingApp) {
                linkedJobAppId = existingApp.id;
              }

              // Create interview
              await prisma.interview.create({
                data: {
                  userId: user.id,
                  company,
                  position: title,
                  scheduledAt,
                  location: interviewDetails.location || null,
                  meetingLink: interviewDetails.meetingUrl || null,
                  notes: interviewDetails.instructions || null,
                  applicationId: existingApp?.id || null,
                }
              });
            }
          }
        } else if (classification.company && classification.role) {
          const existingApp = await prisma.jobApplication.findFirst({
            where: {
              userId: user.id,
              company: { equals: classification.company.trim(), mode: "insensitive" },
              role: { equals: classification.role.trim(), mode: "insensitive" },
            }
          });
          if (existingApp) {
            linkedJobAppId = existingApp.id;
          }
        }

        // ─── Recruiter Contact Extraction ──────────────────────────────────
        if (
          (classification.category === "RECRUITER_CONTACT" || classification.category === "EMPLOYER_CONTACT") &&
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
                relationship: classification.category === "RECRUITER_CONTACT" ? "RECRUITER" : "EMPLOYER",
                lastContactedAt: receivedAt ?? new Date(),
                communicationCount: 1,
                sourceEmailIds: [savedEmail.id],
              },
            });
          }
        }

        // ─── Career Reminder / Deadline Extraction ───────────────────────────
        if (classification.category === "ASSESSMENT" || classification.category === "INTERVIEW_INVITATION") {
          // Create a career reminder for interviews and assessments
          const interviewDetails = classification.category === "INTERVIEW_INVITATION"
            ? await extractInterviewDetails(subject, snippet).catch(() => null)
            : null;
          const deadlineDate = interviewDetails?.date ? new Date(interviewDetails.date) : null;

          if (deadlineDate && !isNaN(deadlineDate.getTime())) {
            const reminderType = classification.category === "ASSESSMENT" ? "ASSESSMENT_DEADLINE" : "INTERVIEW_DATE";
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
      data: { emailsProcessed, jobsDiscovered, syncedAt: new Date() },
    };
  } catch (err) {
    console.error("[gmail-sync] fatal error:", err instanceof Error ? err.message : "unknown");
    return { success: false, error: "Unable to sync Gmail right now. Please try again." };
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
      ...(options?.category ? { category: options.category } : {}),
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
