// ─── HTML Sanitization ─────────────────────────────────────────

/**
 * Strip all HTML tags from a string. Safe for rendering user content.
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Sanitize user input to prevent XSS.
 * Strips HTML tags and escapes special characters.
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

// ─── URL Sanitization ─────────────────────────────────────────

const ALLOWED_PROTOCOLS = ["http:", "https:"];
const BLOCKED_HOSTS = [
  "localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal",
  "169.254.169.254", "instance-metadata",
];

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;
    if (BLOCKED_HOSTS.includes(parsed.hostname)) return false;
    if (parsed.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) return false;
    return true;
  } catch {
    return false;
  }
}

export function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    return allowedDomains.some(d =>
      parsed.hostname === d || parsed.hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

// ─── String Sanitization ──────────────────────────────────────

/**
 * Sanitize a string for use as a filename.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 255);
}

/**
 * Limit string length with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Generate a safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// ─── Input Length Validation ───────────────────────────────────

export function validateLength(value: string, min: number, max: number, fieldName: string): string | null {
  if (value.length < min) return `${fieldName} must be at least ${min} characters`;
  if (value.length > max) return `${fieldName} must be at most ${max} characters`;
  return null;
}

// ─── SQL Injection Prevention (Additional) ─────────────────────

/**
 * Check for common SQL injection patterns in user input.
 * Note: Prisma ORM already prevents SQL injection, but this is an extra layer.
 */
export function detectSqlInjection(input: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|DECLARE)\b)/i,
    /(--|\/\*|\*\/|;)/,
    /(' OR '1'='1|" OR "1"="1)/i,
    /('\s*OR\s*'|"\s*OR\s*")/i,
    /(CHAR\(|CONCAT\(|0x[0-9a-f]+)/i,
  ];
  return patterns.some(p => p.test(input));
}
