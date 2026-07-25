import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

async function ensureCalendarTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CalendarConnection" (
      id TEXT PRIMARY KEY DEFAULT (cuid()),
      "userId" TEXT UNIQUE NOT NULL,
      "accessToken" TEXT NOT NULL,
      "refreshToken" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
      CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?calendar=error&reason=${error}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard?calendar=error&reason=missing_params", req.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/calendar/callback`;

    if (!clientId || !clientSecret || clientId === "placeholder") {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/dashboard?calendar=error&reason=no_access_token", req.url)
      );
    }

    await ensureCalendarTable();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "CalendarConnection" ("userId", "accessToken", "refreshToken", "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, now(), now())
       ON CONFLICT ("userId") DO UPDATE SET "accessToken" = $2, "refreshToken" = $3, "expiresAt" = $4, "updatedAt" = now()`,
      state,
      tokens.access_token,
      tokens.refresh_token ?? "",
      new Date(tokens.expiry_date ?? Date.now() + 3600000)
    );

    return NextResponse.redirect(new URL("/dashboard?calendar=connected", req.url));
  } catch (error) {
    console.error("Calendar callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?calendar=error&reason=callback_failed", req.url)
    );
  }
}
