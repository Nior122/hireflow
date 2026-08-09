import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { verifyOAuthState } from "@/lib/oauth-state";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // This is the Clerk user ID

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings?calendar=error&reason=${encodeURIComponent(error)}`, origin)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error&reason=missing_params", origin)
      );
    }

    const clerkId = verifyOAuthState(state);
    if (!clerkId) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error&reason=invalid_state", origin)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
      `${origin}/api/auth/calendar/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error&reason=not_configured", origin)
      );
    }

    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error&reason=no_access_token", origin)
      );
    }

    // Look up the internal DB user from the Clerk ID stored in `state`
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?calendar=error&reason=user_not_found", origin)
      );
    }

    // Upsert the CalendarConnection using Prisma's typed API
    await prisma.calendarConnection.upsert({
      where: { userId: dbUser.id },
      create: {
        userId: dbUser.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3_600_000),
      },
    });

    return NextResponse.redirect(new URL("/dashboard/settings?calendar=connected", origin));
  } catch (err) {
    console.error("Calendar callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?calendar=error&reason=callback_failed", origin)
    );
  }
}
