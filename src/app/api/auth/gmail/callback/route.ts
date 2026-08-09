import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://hireflows.vercel.app";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // This is the Clerk userId

    if (error) {
      console.error("Gmail OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?gmail=error&reason=${encodeURIComponent(error)}`, APP_URL)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?gmail=error&reason=missing_params", APP_URL)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ??
      `${APP_URL}/api/auth/gmail/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?gmail=error&reason=not_configured", APP_URL)
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?gmail=error&reason=no_access_token", APP_URL)
      );
    }

    // Look up the internal DB user from the Clerk ID stored in `state`
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: state },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?gmail=error&reason=user_not_found", APP_URL)
      );
    }

    // Store tokens in database using internal DB user ID
    await prisma.gmailToken.upsert({
      where: { userId: dbUser.id },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiryDate: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3_600_000),
      },
      create: {
        userId: dbUser.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiryDate: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3_600_000),
      },
    });

    return NextResponse.redirect(new URL("/dashboard/settings?gmail=connected", APP_URL));
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard/settings?gmail=error&reason=callback_failed", APP_URL)
    );
  }
}
