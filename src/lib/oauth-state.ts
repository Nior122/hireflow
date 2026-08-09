import crypto from "crypto";

const SECRET = process.env.GOOGLE_CLIENT_SECRET || "fallback_secret_for_dev";

export function generateOAuthState(userId: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const data = `${userId}:${nonce}`;
  const hmac = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  const stateObj = { u: userId, n: nonce, h: hmac };
  return Buffer.from(JSON.stringify(stateObj)).toString("base64url");
}

export function verifyOAuthState(stateBase64: string): string | null {
  try {
    const jsonStr = Buffer.from(stateBase64, "base64url").toString("utf-8");
    const { u, n, h } = JSON.parse(jsonStr);
    if (!u || !n || !h) return null;

    const data = `${u}:${n}`;
    const expectedHmac = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
    
    if (crypto.timingSafeEqual(Buffer.from(h), Buffer.from(expectedHmac))) {
      return u;
    }
    return null;
  } catch {
    return null;
  }
}
