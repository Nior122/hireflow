const requests = new Map<string, { count: number; resetTime: number }>();
const CLEANUP_INTERVAL = 60000;

// Cleanup old entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < now) requests.delete(key);
    }
  }, CLEANUP_INTERVAL);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetIn: number;
}

export function rateLimit(
  key: string,
  limit: number = 100,
  windowMs: number = 60000,
): RateLimitResult {
  const now = Date.now();
  const existing = requests.get(key);

  if (!existing || existing.resetTime < now) {
    requests.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, limit, resetIn: windowMs };
  }

  existing.count++;

  if (existing.count > limit) {
    return { allowed: false, remaining: 0, limit, resetIn: Math.ceil((existing.resetTime - now) / 1000) };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    limit,
    resetIn: Math.ceil((existing.resetTime - now) / 1000),
  };
}

export function rateLimitKey(req: Request, prefix: string = "api"): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const url = new URL(req.url);
  return `${prefix}:${ip}:${url.pathname}`;
}
