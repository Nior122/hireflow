'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { classifyEmail } from "@/lib/ai";
import { revalidatePath } from "next/cache";

interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  body: string;
  date: string;
}

export async function connectGmail(accessToken: string, refreshToken: string, expiryDate: Date): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await createOrGetUser();
    await prisma.gmailToken.upsert({
      where: { userId: user.id },
      update: { accessToken, refreshToken, expiryDate },
      create: { userId: user.id, accessToken, refreshToken, expiryDate },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { success: false, error: "Failed to connect Gmail" }; }
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!token) return null;

  // Check if token is expired
  if (token.expiryDate && new Date(token.expiryDate) < new Date()) {
    // Try to refresh
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/gmail/callback`;

      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      oauth2Client.setCredentials({ refresh_token: token.refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();
      await prisma.gmailToken.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token!,
          expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000),
        },
      });
      return credentials.access_token!;
    } catch {
      return null; // Refresh failed
    }
  }

  return token.accessToken;
}

export async function getGmailStatus(): Promise<{ success: boolean; data?: { connected: boolean; email?: string }; error?: string }> {
  try {
    const user = await createOrGetUser();
    const token = await prisma.gmailToken.findUnique({ where: { userId: user.id } });
    if (!token) return { success: true, data: { connected: false } };
    return { success: true, data: { connected: true } };
  } catch { return { success: false, error: "Failed to check Gmail status" }; }
}

export async function disconnectGmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await createOrGetUser();
    await prisma.gmailToken.delete({ where: { userId: user.id } }).catch(() => {});
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { success: false, error: "Failed to disconnect" }; }
}

export async function scanInbox(): Promise<{ success: boolean; data?: GmailMessage[]; error?: string }> {
  try {
    const user = await createOrGetUser();
    const accessToken = await getValidAccessToken(user.id);
    if (!accessToken) return { success: false, error: "Gmail not connected. Please connect your Gmail first." };

    const response = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=20", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) return { success: false, error: "Failed to fetch emails" };

    const data = await response.json();
    const messages: GmailMessage[] = [];

    if (data.messages) {
      for (const msg of data.messages.slice(0, 10)) {
        const detail = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (detail.ok) {
          const full = await detail.json();
          const headers = full.payload?.headers || [];
          const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value ?? "";
          const from = headers.find((h: { name: string }) => h.name === "From")?.value ?? "";
          const date = headers.find((h: { name: string }) => h.name === "Date")?.value ?? "";

          let body = "";
          if (full.payload?.body?.data) {
            body = Buffer.from(full.payload.body.data, "base64").toString("utf-8");
          } else if (full.payload?.parts) {
            for (const part of full.payload.parts) {
              if (part.mimeType === "text/plain" && part.body?.data) {
                body = Buffer.from(part.body.data, "base64").toString("utf-8");
                break;
              }
            }
          }

          messages.push({ id: msg.id, subject, from, body: body.slice(0, 2000), date });
        }
      }
    }

    return { success: true, data: messages };
  } catch { return { success: false, error: "Failed to scan inbox" }; }
}

export async function classifyEmails(messages: GmailMessage[]): Promise<{ success: boolean; data?: Array<{ message: GmailMessage; classification: any }>; error?: string }> {
  try {
    const results = [];
    for (const msg of messages) {
      try {
        const classification = await classifyEmail(msg.subject, msg.body);
        results.push({ message: msg, classification });
      } catch {
        results.push({ message: msg, classification: { isJobRelated: false, type: "other", summary: "Could not classify", suggestedStatus: "UNAPPLIED" } });
      }
    }
    return { success: true, data: results };
  } catch { return { success: false, error: "Failed to classify emails" }; }
}

export async function importEmailAsApplication(
  message: GmailMessage,
  classification: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await createOrGetUser();
    const lastApp = await prisma.jobApplication.findFirst({
      where: { userId: user.id, status: classification.suggestedStatus },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    await prisma.jobApplication.create({
      data: {
        userId: user.id,
        company: classification.company ?? message.from.split("@")[0],
        role: classification.role ?? "Unknown Role",
        notes: message.body.slice(0, 2000),
        status: classification.suggestedStatus,
        source: "Email",
        sourceEmailId: message.id,
        position: (lastApp?.position ?? -1) + 1,
        link: null,
      },
    });

    await prisma.activityLog.create({
      data: { userId: user.id, action: "IMPORTED_FROM_EMAIL", detail: `Imported email: ${message.subject}` },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { success: false, error: "Failed to import application" }; }
}
