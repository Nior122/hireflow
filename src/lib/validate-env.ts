const REQUIRED_VARS = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_CLERK_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_SIGN_UP_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL",
  "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL",
] as const;

const OPTIONAL_BUT_RECOMMENDED = [
  "GROQ_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

interface ValidationResult {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of REQUIRED_VARS) {
    const val = process.env[v];
    if (!val || val === "placeholder") {
      missing.push(v);
    }
  }

  for (const v of OPTIONAL_BUT_RECOMMENDED) {
    const val = process.env[v];
    if (!val || val === "placeholder") {
      warnings.push(v);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}

let _validated = false;
let _result: ValidationResult | null = null;

export function getEnvStatus(): ValidationResult {
  if (!_validated) {
    _result = validateEnv();
    _validated = true;
  }
  return _result!;
}

export function getEnvStatusHtml(): string {
  const r = getEnvStatus();
  if (r.ok && r.warnings.length === 0) return "";

  const lines: string[] = [];
  if (!r.ok) {
    lines.push(`<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;margin:8px 0">`);
    lines.push(`<h3 style="color:#dc2626;margin:0 0 8px;font-size:14px">Missing required environment variables:</h3>`);
    lines.push(`<ul style="color:#dc2626;margin:0;padding-left:20px;font-size:13px">`);
    for (const v of r.missing) lines.push(`<li><code>${v}</code></li>`);
    lines.push(`</ul></div>`);
  }
  if (r.warnings.length > 0) {
    lines.push(`<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:8px 0">`);
    lines.push(`<h3 style="color:#b45309;margin:0 0 8px;font-size:14px">Optional services not configured:</h3>`);
    lines.push(`<ul style="color:#b45309;margin:0;padding-left:20px;font-size:13px">`);
    for (const v of r.warnings) lines.push(`<li><code>${v}</code> — AI, Gmail, and Calendar features will not work</li>`);
    lines.push(`</ul></div>`);
  }
  return lines.join("\n");
}

// Server-side check that throws in dev to alert immediately
export function assertEnv() {
  if (process.env.NODE_ENV !== "production") {
    const r = validateEnv();
    if (!r.ok) {
      console.error("\n⚠️  HIREFLOW: Missing required environment variables:");
      for (const v of r.missing) console.error(`  - ${v}`);
      console.error("\n");
    }
    if (r.warnings.length > 0) {
      console.warn("\nℹ️  HIREFLOW: Optional services not configured:");
      for (const v of r.warnings) console.warn(`  - ${v}`);
      console.warn("");
    }
  }
}
