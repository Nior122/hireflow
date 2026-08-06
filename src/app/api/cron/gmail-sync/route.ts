import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyEmails, scanInbox } from "@/actions/gmail";
import { importEmailAsApplication } from "@/actions/gmail";

// This route should be protected by a cron secret in production
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get all users with valid Gmail tokens
    const tokens = await prisma.gmailToken.findMany({
      where: {
        expiryDate: { gt: new Date() },
      },
    });

    let syncCount = 0;
    const results = [];

    // 2. Loop over users and fetch recent unread emails
    for (const token of tokens) {
      try {
        // Fetch emails from the user's inbox
        // Note: We need a server-side way to authenticate as the user,
        // which means adapting `scanInbox` or writing a direct Google API call.
        // For this cron job, we assume `scanInbox` uses `createOrGetUser`,
        // which relies on Clerk. Since this is a cron, there is no Clerk user session.
        // We must directly use the token's accessToken to call Google APIs.
        
        const response = await fetch(
          "https://www.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=10",
          {
            headers: { Authorization: `Bearer ${token.accessToken}` },
          }
        );

        if (!response.ok) {
          results.push({ userId: token.userId, status: "error", error: "Failed to fetch emails" });
          continue;
        }

        const data = await response.json();
        if (!data.messages) {
          results.push({ userId: token.userId, status: "no_messages" });
          continue;
        }

        const messages = [];
        for (const msg of data.messages) {
          const detail = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            {
              headers: { Authorization: `Bearer ${token.accessToken}` },
            }
          );
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

        // 3. Classify and Import job-related emails
        const classified = await classifyEmails(messages);
        let imported = 0;
        
        if (classified.success && classified.data) {
          const jobEmails = classified.data.filter((e: any) => e.classification.isJobRelated);
          
          for (const email of jobEmails) {
            // Check duplicate
            const existing = await prisma.jobApplication.findFirst({
              where: { userId: token.userId, sourceEmailId: email.message.id }
            });
            
            if (!existing) {
              // Import directly using Prisma to avoid `createOrGetUser` constraint
              const lastApp = await prisma.jobApplication.findFirst({
                where: { userId: token.userId, status: email.classification.suggestedStatus as any },
                orderBy: { position: "desc" },
                select: { position: true },
              });
          
              await prisma.jobApplication.create({
                data: {
                  userId: token.userId,
                  company: email.classification.company ?? email.message.from.split("@")[0],
                  role: email.classification.role ?? "Unknown Role",
                  notes: email.message.body.slice(0, 2000),
                  status: email.classification.suggestedStatus as any,
                  source: "Email",
                  sourceEmailId: email.message.id,
                  position: (lastApp?.position ?? -1) + 1,
                  link: null,
                },
              });
              
              await prisma.activityLog.create({
                data: { userId: token.userId, action: "IMPORTED_FROM_EMAIL_CRON", detail: `Auto-imported email: ${email.message.subject}` },
              });
              imported++;
              syncCount++;
            }
          }
        }
        
        // Update lastSyncedAt
        await prisma.gmailToken.update({
          where: { id: token.id },
          data: { lastSyncedAt: new Date() }
        });

        results.push({ userId: token.userId, status: "success", imported });
      } catch (err) {
        results.push({ userId: token.userId, status: "error", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return NextResponse.json({ success: true, syncCount, results });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
