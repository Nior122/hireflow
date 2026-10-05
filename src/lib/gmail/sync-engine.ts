import { prisma } from "@/lib/prisma";
import { getValidGmailToken } from "@/lib/gmail/tokens";
import {
  deterministicClassify,
  extractEmailBody,
  inferCompanyAndRole,
  mapPool,
  parseEmailAddress,
  shouldUseIncrementalSync,
  type EmailClassification,
} from "@/lib/gmail/email-utils";

export interface GmailSyncSummary {
  emailsProcessed: number;
  emailsSkipped: number;
  jobsDiscovered: number;
  applicationsDiscovered: number;
  interviewsDiscovered: number;
  rejectionsDiscovered: number;
  offersDiscovered: number;
  syncedAt: Date;
}

export interface GmailSyncOptions {
  forceFullSync?: boolean;
  maxMessages?: number;
}

const GMAIL_API = "https://www.googleapis.com/gmail/v1/users/me";
const DEFAULT_MAX_MESSAGES = 50;
const FETCH_CONCURRENCY = 5;

interface GmailListMessage {
  id: string;
  threadId?: string;
}

async function gmailFetch(path: string, accessToken: string): Promise<Response> {
  return fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function listInboxMessages(
  accessToken: string,
  maxResults: number
): Promise<{ messages: GmailListMessage[]; historyId: string | null }> {
  const query = encodeURIComponent("in:inbox");
  const listRes = await gmailFetch(`/messages?maxResults=${maxResults}&q=${query}`, accessToken);
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    const error = new Error(`Failed to fetch Gmail messages (${listRes.status})`);
    (error as Error & { status?: number; details?: unknown }).status = listRes.status;
    (error as Error & { details?: unknown }).details = err;
    throw error;
  }

  const listData = await listRes.json();
  const messages: GmailListMessage[] = listData.messages ?? [];

  let historyId: string | null = listData.historyId ?? null;
  if (!historyId) {
    const profileRes = await gmailFetch("/profile", accessToken);
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      historyId = profileData.historyId || null;
    }
  }

  return { messages, historyId };
}

async function listHistoryMessages(
  accessToken: string,
  historyId: string
): Promise<{ messages: GmailListMessage[]; historyId: string | null; ok: boolean }> {
  const histRes = await gmailFetch(
    `/history?startHistoryId=${encodeURIComponent(historyId)}&historyTypes=messageAdded`,
    accessToken
  );

  if (!histRes.ok) {
    return { messages: [], historyId: null, ok: false };
  }

  const histData = await histRes.json();
  const messages: GmailListMessage[] = [];
  for (const record of histData.history || []) {
    for (const item of record.messagesAdded || []) {
      if (item.message?.id) messages.push({ id: item.message.id, threadId: item.message.threadId });
    }
  }

  return {
    messages,
    historyId: histData.historyId || historyId,
    ok: true,
  };
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

async function upsertEmailForUser(
  userId: string,
  gmailMessageId: string,
  data: {
    gmailThreadId: string | null;
    sender: string | null;
    senderEmail: string | null;
    recipients: string | null;
    subject: string | null;
    snippet: string | null;
    body: string | null;
    receivedAt: Date | null;
    isRead: boolean;
    labels: string[];
    classification: EmailClassification;
  }
) {
  const existing = await prisma.emailMessage.findFirst({
    where: {
      userId,
      OR: [
        { gmailMessageId },
        { gmailMessageId: `${userId}:${gmailMessageId}` },
      ],
    },
  });

  const classificationFields = {
    category: data.classification.category,
    confidence: data.classification.confidence,
    jobRelated: data.classification.jobRelated,
    applicationRelated: data.classification.applicationRelated,
    interviewRelated: data.classification.interviewRelated,
    rejectionRelated: data.classification.rejectionRelated,
    offerRelated: data.classification.offerRelated,
    urgency: data.classification.urgency,
    importance: data.classification.importance,
    action: data.classification.action ?? null,
    replyDraft: data.classification.replyDraft ?? null,
    isRead: data.isRead,
    labels: data.labels,
    ...(data.body ? { body: data.body } : {}),
  };

  if (existing) {
    return prisma.emailMessage.update({
      where: { id: existing.id },
      data: classificationFields,
    });
  }

  const createData = {
    userId,
    gmailMessageId,
    gmailThreadId: data.gmailThreadId,
    sender: data.sender,
    senderEmail: data.senderEmail,
    recipients: data.recipients,
    subject: data.subject,
    snippet: data.snippet,
    body: data.body,
    receivedAt: data.receivedAt,
    isRead: data.isRead,
    labels: data.labels,
    category: data.classification.category,
    confidence: data.classification.confidence,
    jobRelated: data.classification.jobRelated,
    applicationRelated: data.classification.applicationRelated,
    interviewRelated: data.classification.interviewRelated,
    rejectionRelated: data.classification.rejectionRelated,
    offerRelated: data.classification.offerRelated,
    urgency: data.classification.urgency,
    importance: data.classification.importance,
    action: data.classification.action ?? null,
    replyDraft: data.classification.replyDraft ?? null,
  };

  try {
    return await prisma.emailMessage.create({ data: createData });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== "P2002") throw err;

    // Legacy schema had a global unique on gmailMessageId. If another row
    // already claimed this id, store a per-user copy so this inbox still fills.
    const conflict = await prisma.emailMessage.findFirst({ where: { gmailMessageId } });
    if (conflict?.userId === userId) {
      return prisma.emailMessage.update({
        where: { id: conflict.id },
        data: classificationFields,
      });
    }

    return prisma.emailMessage.create({
      data: { ...createData, gmailMessageId: `${userId}:${gmailMessageId}` },
    });
  }
}

async function extractEntitiesForEmail(
  userId: string,
  savedEmail: { id: string; subject: string | null; sender: string | null; senderEmail: string | null },
  classification: EmailClassification,
  snippet: string
): Promise<{
  linkedJobAppId: string | null;
  jobsDiscovered: number;
  applicationsDiscovered: number;
  interviewsDiscovered: number;
  rejectionsDiscovered: number;
  offersDiscovered: number;
}> {
  const counts = {
    linkedJobAppId: null as string | null,
    jobsDiscovered: 0,
    applicationsDiscovered: 0,
    interviewsDiscovered: 0,
    rejectionsDiscovered: 0,
    offersDiscovered: 0,
  };

  const { company, role } = inferCompanyAndRole(
    classification.company,
    classification.role,
    savedEmail.subject,
    savedEmail.sender,
    savedEmail.senderEmail
  );

  if (classification.category === "JOB_OPPORTUNITY") {
    const existingApp = await prisma.jobApplication.findFirst({
      where: {
        userId,
        company: { equals: company, mode: "insensitive" },
        role: { equals: role, mode: "insensitive" },
      },
    });
    if (existingApp) {
      counts.linkedJobAppId = existingApp.id;
    } else {
      const existingDiscovered = await prisma.discoveredJob.findFirst({
        where: {
          userId,
          company: { equals: company, mode: "insensitive" },
          title: { equals: role, mode: "insensitive" },
        },
      });
      if (!existingDiscovered) {
        await prisma.discoveredJob.create({
          data: {
            userId,
            sourceEmailId: savedEmail.id,
            title: role,
            company,
            status: "NEW",
          },
        });
        counts.jobsDiscovered++;
      }
    }
  } else if (classification.category === "APPLICATIONS") {
    let existingApp = await prisma.jobApplication.findFirst({
      where: { userId, company: { equals: company, mode: "insensitive" } },
    });
    if (!existingApp) {
      existingApp = await prisma.jobApplication.create({
        data: {
          userId,
          company,
          role: role || "Software Role",
          status: "APPLIED",
          source: "Gmail Sync",
          sourceEmailId: savedEmail.id,
        },
      });
      counts.applicationsDiscovered++;
    }
    counts.linkedJobAppId = existingApp.id;
  } else if (classification.category === "INTERVIEWS") {
    let existingApp = await prisma.jobApplication.findFirst({
      where: { userId, company: { equals: company, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
    if (existingApp) {
      await prisma.jobApplication.update({
        where: { id: existingApp.id },
        data: { status: "INTERVIEW" },
      });
    } else {
      existingApp = await prisma.jobApplication.create({
        data: {
          userId,
          company,
          role,
          status: "INTERVIEW",
          source: "Gmail Sync",
          sourceEmailId: savedEmail.id,
        },
      });
      counts.applicationsDiscovered++;
    }
    counts.linkedJobAppId = existingApp.id;

    const existingInterview = await prisma.interview.findFirst({
      where: { userId, applicationId: existingApp.id },
    });
    if (!existingInterview) {
      await prisma.interview.create({
        data: {
          userId,
          company,
          position: role,
          scheduledAt: null,
          notes: snippet.slice(0, 500) || savedEmail.subject,
          applicationId: existingApp.id,
        },
      });
      counts.interviewsDiscovered++;
    }
  } else if (classification.category === "REJECTIONS") {
    const existingApp = await prisma.jobApplication.findFirst({
      where: { userId, company: { equals: company, mode: "insensitive" } },
    });
    if (existingApp) {
      await prisma.jobApplication.update({
        where: { id: existingApp.id },
        data: { status: "REJECTED" },
      });
      counts.linkedJobAppId = existingApp.id;
      counts.rejectionsDiscovered++;
    }
  } else if (classification.category === "OFFERS") {
    let existingApp = await prisma.jobApplication.findFirst({
      where: { userId, company: { equals: company, mode: "insensitive" } },
    });
    if (existingApp) {
      await prisma.jobApplication.update({
        where: { id: existingApp.id },
        data: { status: "OFFER" },
      });
    } else {
      existingApp = await prisma.jobApplication.create({
        data: {
          userId,
          company,
          role: role || "Job Role",
          status: "OFFER",
          source: "Gmail Sync",
          sourceEmailId: savedEmail.id,
        },
      });
      counts.applicationsDiscovered++;
    }
    counts.linkedJobAppId = existingApp.id;
    counts.offersDiscovered++;
  } else if (classification.category === "RECRUITERS" && savedEmail.senderEmail) {
    const existingContact = await prisma.recruiterContact.findFirst({
      where: { userId, email: { equals: savedEmail.senderEmail, mode: "insensitive" } },
    });
    if (existingContact) {
      const sourceIds = existingContact.sourceEmailIds.includes(savedEmail.id)
        ? existingContact.sourceEmailIds
        : [...existingContact.sourceEmailIds, savedEmail.id];
      await prisma.recruiterContact.update({
        where: { id: existingContact.id },
        data: {
          communicationCount: { increment: 1 },
          lastContactedAt: new Date(),
          sourceEmailIds: sourceIds,
        },
      });
    } else {
      await prisma.recruiterContact.create({
        data: {
          userId,
          name: savedEmail.sender || "Unknown",
          email: savedEmail.senderEmail,
          company: classification.company?.trim() || company,
          role: classification.role?.trim() || null,
          relationship: "RECRUITER",
          lastContactedAt: new Date(),
          communicationCount: 1,
          sourceEmailIds: [savedEmail.id],
        },
      });
    }
  }

  if (counts.linkedJobAppId) {
    await prisma.emailMessage.update({
      where: { id: savedEmail.id },
      data: { jobApplicationId: counts.linkedJobAppId },
    });
  }

  return counts;
}

export async function runGmailSyncForUser(
  userId: string,
  options?: GmailSyncOptions
): Promise<GmailSyncSummary> {
  const tokenRecord = await prisma.gmailToken.findUnique({ where: { userId } });
  const accessToken = await getValidGmailToken(userId);

  if (!accessToken || !tokenRecord) {
    throw new Error("Gmail not connected. Please connect Gmail in Settings first.");
  }

  const maxMessages = options?.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const storedEmailCount = await prisma.emailMessage.count({ where: { userId } });

  let messageList: GmailListMessage[] = [];
  let newHistoryId: string | null = null;

  const useIncremental = shouldUseIncrementalSync({
    historyId: tokenRecord.historyId,
    storedEmailCount,
    forceFullSync: options?.forceFullSync,
  });

  if (useIncremental && tokenRecord.historyId) {
    const incremental = await listHistoryMessages(accessToken, tokenRecord.historyId);
    if (incremental.ok) {
      messageList = incremental.messages;
      newHistoryId = incremental.historyId;
    }
  }

  // Always also pull the recent inbox. A stale historyId used to make sync
  // report success while importing zero emails; unioning the inbox list
  // backfills anything the cursor skipped (including the first-ever import).
  const full = await listInboxMessages(accessToken, maxMessages);
  newHistoryId = full.historyId ?? newHistoryId;
  const byId = new Map<string, GmailListMessage>();
  for (const msg of [...full.messages, ...messageList]) {
    if (msg.id) byId.set(msg.id, msg);
  }
  messageList = Array.from(byId.values());

  const uniqueIds = Array.from(new Set(messageList.map((m) => m.id).filter(Boolean)));

  if (uniqueIds.length === 0) {
    await prisma.gmailToken.updateMany({
      where: { userId },
      data: {
        lastSyncedAt: new Date(),
        ...(newHistoryId ? { historyId: newHistoryId } : {}),
      },
    });
    return {
      emailsProcessed: 0,
      emailsSkipped: 0,
      jobsDiscovered: 0,
      applicationsDiscovered: 0,
      interviewsDiscovered: 0,
      rejectionsDiscovered: 0,
      offersDiscovered: 0,
      syncedAt: new Date(),
    };
  }

  const alreadyStored = await prisma.emailMessage.findMany({
    where: {
      userId,
      OR: [
        { gmailMessageId: { in: uniqueIds } },
        { gmailMessageId: { in: uniqueIds.map((id) => `${userId}:${id}`) } },
      ],
    },
    select: { gmailMessageId: true },
  });
  const storedIdSet = new Set(
    alreadyStored.map((row) => row.gmailMessageId.replace(`${userId}:`, ""))
  );

  const toProcess = uniqueIds.filter((id) => !storedIdSet.has(id));
  const emailsSkipped = uniqueIds.length - toProcess.length;

  let emailsProcessed = 0;
  let jobsDiscovered = 0;
  let applicationsDiscovered = 0;
  let interviewsDiscovered = 0;
  let rejectionsDiscovered = 0;
  let offersDiscovered = 0;

  await mapPool(toProcess, FETCH_CONCURRENCY, async (msgId) => {
    try {
      const metaRes = await gmailFetch(`/messages/${msgId}?format=full`, accessToken);
      if (!metaRes.ok) return;

      const meta = await metaRes.json();
      const headers: { name: string; value: string }[] = meta.payload?.headers ?? [];
      const subject = getHeader(headers, "Subject");
      const fromRaw = getHeader(headers, "From");
      const to = getHeader(headers, "To");
      const dateStr = getHeader(headers, "Date");
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
        receivedAt = new Date(parseInt(meta.internalDate, 10));
      }

      const bodyText = extractEmailBody(meta.payload);
      const limitedBody = bodyText.slice(0, 2500);
      const classification = deterministicClassify(`${subject} ${snippet} ${limitedBody}`);

      const savedEmail = await upsertEmailForUser(userId, msgId, {
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
        classification,
      });

      emailsProcessed++;

      const extracted = await extractEntitiesForEmail(
        userId,
        {
          id: savedEmail.id,
          subject: savedEmail.subject,
          sender: savedEmail.sender,
          senderEmail: savedEmail.senderEmail,
        },
        classification,
        snippet
      );

      jobsDiscovered += extracted.jobsDiscovered;
      applicationsDiscovered += extracted.applicationsDiscovered;
      interviewsDiscovered += extracted.interviewsDiscovered;
      rejectionsDiscovered += extracted.rejectionsDiscovered;
      offersDiscovered += extracted.offersDiscovered;
    } catch (msgErr) {
      console.error(
        "[gmail-sync] error processing message:",
        msgId,
        msgErr instanceof Error ? msgErr.message : "unknown"
      );
    }
  });

  await prisma.gmailToken.updateMany({
    where: { userId },
    data: {
      lastSyncedAt: new Date(),
      ...(newHistoryId ? { historyId: newHistoryId } : {}),
    },
  });

  return {
    emailsProcessed,
    emailsSkipped,
    jobsDiscovered,
    applicationsDiscovered,
    interviewsDiscovered,
    rejectionsDiscovered,
    offersDiscovered,
    syncedAt: new Date(),
  };
}
