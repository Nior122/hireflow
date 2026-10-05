import { prisma } from "@/lib/prisma";

export async function getValidGmailToken(userId: string): Promise<string | null> {
  const token = await prisma.gmailToken.findUnique({ where: { userId } });
  if (!token?.accessToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const expired =
    !token.expiryDate || new Date(token.expiryDate).getTime() < Date.now() + 60_000;

  if (!expired) return token.accessToken;
  if (!clientId || !clientSecret || !token.refreshToken) return null;

  try {
    const { google } = await import("googleapis");
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.expiryDate ? new Date(token.expiryDate).getTime() : undefined,
    });

    const tokenResponse = await oauth2Client.getAccessToken();
    const accessToken = tokenResponse?.token;
    if (!accessToken) return null;

    const expiryDate = oauth2Client.credentials.expiry_date
      ? new Date(oauth2Client.credentials.expiry_date)
      : new Date(Date.now() + 3_600_000);

    await prisma.gmailToken.update({
      where: { userId },
      data: { accessToken, expiryDate },
    });

    return accessToken;
  } catch (err) {
    console.error("[gmail-token] refresh failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
