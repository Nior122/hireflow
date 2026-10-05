import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runGmailSyncForUser } from "@/lib/gmail/sync-engine";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      !process.env.CRON_SECRET ||
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokens = await prisma.gmailToken.findMany({
      select: { userId: true },
    });

    let syncCount = 0;
    const results = [];

    for (const token of tokens) {
      try {
        const summary = await runGmailSyncForUser(token.userId);
        syncCount += summary.emailsProcessed;
        results.push({
          userId: token.userId,
          status: "success",
          imported: summary.emailsProcessed,
          skipped: summary.emailsSkipped,
        });
      } catch (err) {
        results.push({
          userId: token.userId,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, syncCount, results });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
