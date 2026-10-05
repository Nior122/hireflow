import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/monitoring/logger";
import { getAiConfigurationStatus } from "@/lib/ai-config";

interface HealthCheck {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  version: string;
  uptime: number;
  /**
   * Which build is answering this request. Vercel injects these; they are safe to
   * expose and are the fastest way to prove a domain serves the commit you expect.
   */
  deployment: {
    environment: string;
    commit: string | null;
    branch: string | null;
    url: string | null;
  };
  checks: {
    database: { status: string; latency?: number };
    environment: { status: string; missing?: string[] };
    ai: {
      status: string;
      provider: string;
      model: string | null;
      error?: string | null;
    };
    /** @deprecated use `checks.ai`; kept so existing dashboards keep working. */
    groq: { status: string };
    google: { status: string };
    stripe: { status: string };
    memory: { status: string; usage?: string };
  };
}

function vercelUrl(): string | null {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return host ? `https://${host}` : null;
}

export async function GET() {
  const start = Date.now();
  const checks: HealthCheck["checks"] = {
    database: { status: "checking" },
    environment: { status: "checking" },
    ai: { status: "checking", provider: "unknown", model: null },
    groq: { status: "checking" },
    google: { status: "checking" },
    stripe: { status: "checking" },
    memory: { status: "checking" },
  };

  let overallStatus: "healthy" | "degraded" | "down" = "healthy";

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "connected", latency: Date.now() - dbStart };
  } catch {
    checks.database = { status: "disconnected" };
    overallStatus = "down";
  }

  // Environment check
  const requiredVars = ["DATABASE_URL", "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
  const missing = requiredVars.filter(k => !process.env[k] || process.env[k] === "placeholder");
  if (missing.length > 0) {
    checks.environment = { status: "incomplete", missing };
    overallStatus = "degraded";
  } else {
    checks.environment = { status: "configured" };
  }

  // AI check: provider-agnostic and model-aware. A key without a model is not a
  // working configuration, so report `not_configured` and surface why.
  // Only the provider name and model id are returned - never the key or endpoint.
  const ai = getAiConfigurationStatus();
  checks.ai = {
    status: ai.configured ? "configured" : "not_configured",
    provider: ai.provider,
    model: ai.model,
    error: ai.error,
  };
  checks.groq = { status: checks.ai.status };

  // Service checks
  checks.google = {
    status: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== "placeholder" ? "configured" : "not_configured",
  };
  checks.stripe = {
    status: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "placeholder" ? "configured" : "not_configured",
  };

  // Memory check
  if (typeof process !== "undefined") {
    const mem = process.memoryUsage();
    checks.memory = {
      status: mem.heapUsed / mem.heapTotal > 0.85 ? "high" : "normal",
      usage: `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    };
  }

  const duration = Date.now() - start;
  logger.info("Health check completed", { duration, metadata: { status: overallStatus } });

  return Response.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "1.0.0",
    uptime: process.uptime(),
    deployment: {
      environment: process.env.VERCEL_ENV ?? "local",
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      url: vercelUrl(),
    },
    checks,
  } satisfies HealthCheck, {
    status: overallStatus === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
