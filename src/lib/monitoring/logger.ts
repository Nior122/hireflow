/**
 * Structured logging utility for HireFlow.
 * Production-ready logging with context tracking.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  requestId?: string;
  userId?: string;
  orgId?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

const SERVICE_NAME = "hireflow";

function formatLog(entry: LogEntry): string {
  const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.service}] ${entry.message}`;
  const context = [
    entry.requestId ? `reqId=${entry.requestId}` : null,
    entry.userId ? `userId=${entry.userId}` : null,
    entry.orgId ? `orgId=${entry.orgId}` : null,
    entry.duration ? `duration=${entry.duration}ms` : null,
    entry.error ? `error="${entry.error}"` : null,
  ].filter(Boolean).join(" ");

  return context ? `${base} ${context}` : base;
}

function log(level: LogLevel, message: string, context?: Partial<LogEntry>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    message,
    ...context,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      if (process.env.NODE_ENV === "development") console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, ctx?: Partial<LogEntry>) => log("debug", message, ctx),
  info: (message: string, ctx?: Partial<LogEntry>) => log("info", message, ctx),
  warn: (message: string, ctx?: Partial<LogEntry>) => log("warn", message, ctx),
  error: (message: string, ctx?: Partial<LogEntry>) => log("error", message, ctx),
};

/**
 * Track API request duration.
 */
export function trackRequest(name: string, requestId?: string) {
  const start = Date.now();
  return {
    end: (status: "success" | "error", metadata?: Record<string, unknown>) => {
      const duration = Date.now() - start;
      const level = status === "error" ? "warn" : "info";
      log(level, `${name} ${status}`, { requestId, duration, metadata });
    },
  };
}

/**
 * Track database query performance.
 */
export function trackQuery(queryName: string, requestId?: string) {
  const start = Date.now();
  return {
    end: (success: boolean, metadata?: Record<string, unknown>) => {
      const duration = Date.now() - start;
      const level = success ? "debug" : "warn";
      log(level, `DB query: ${queryName}`, { requestId, duration, metadata });
    },
  };
}

/**
 * Track AI request performance.
 */
export function trackAiRequest(action: string, requestId?: string) {
  const start = Date.now();
  return {
    end: (success: boolean, metadata?: Record<string, unknown>) => {
      const duration = Date.now() - start;
      const level = success ? "info" : "warn";
      log(level, `AI request: ${action}`, { requestId, duration, metadata });
    },
  };
}
