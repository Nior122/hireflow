import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/monitoring/logger";

interface HealthCheck {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: string; latency?: number };
    environment: { status: string; missing?: string[] };
    groq: { status: string };
    google: { status: string };
    stripe: { status: string };
    memory: { status: string; usage?: string };
  };
}

export async function GET() {
  const start = Date.now();
  const checks: HealthCheck["checks"] = {
    database: { status: "checking" },
    environment: { status: "checking" },
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

  // Service checks
  checks.groq = {
    status: process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "placeholder" ? "configured" : "not_configured",
  };
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
    checks,
  } satisfies HealthCheck, {
    status: overallStatus === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
