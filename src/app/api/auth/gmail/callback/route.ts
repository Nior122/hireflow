import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state"); // This is the Clerk userId

    if (error) {
      console.error("Gmail OAuth error:", error);
      return NextResponse.redirect(
        new URL("/dashboard?gmail=error&reason=" + error, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard?gmail=error&reason=missing_code", req.url)
      );
    }

    if (!state) {
      return NextResponse.redirect(
        new URL("/dashboard?gmail=error&reason=missing_state", req.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/gmail/callback`;

    if (!clientId || !clientSecret || clientId === "placeholder") {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/dashboard?gmail=error&reason=no_access_token", req.url)
      );
    }

    // Store tokens in database, associated with the user from the state parameter
    await prisma.gmailToken.upsert({
      where: { userId: state },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiryDate: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
      },
      create: {
        userId: state,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? "",
        expiryDate: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000),
      },
    });

    return NextResponse.redirect(new URL("/dashboard?gmail=connected", req.url));
  } catch (error) {
    console.error("Gmail callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?gmail=error&reason=callback_failed", req.url)
    );
  }
}
