/**
 * AI Safety System — Prevents prompt injection, data leakage, and abuse.
 */

import { z } from "zod";

// Prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instructions/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /forget\s+(everything|all|your)\s+(previous|prior|instructions)/i,
  /system\s*:\s*/i,
  /new\s+instructions:\s*/i,
  /override\s+(your|all)\s+(previous|prior|instructions)/i,
  /act\s+as\s+if\s+you\s+have\s+no\s+restrictions/i,
  /\[INST\]/i,
  /\[/i,
];

// Sensitive data patterns
const SENSITIVE_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{16}\b/, // Credit card
  /password\s*[:=]\s*\S+/i, // Passwords
  /api[_-]?key\s*[:=]\s*\S+/i, // API keys
  /secret\s*[:=]\s*\S+/i, // Secrets
  /bearer\s+\S+/i, // Auth tokens
];

/**
 * Check if input contains prompt injection attempts.
 */
export function detectPromptInjection(input: string): { safe: boolean; reason?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, reason: "Potential prompt injection detected" };
    }
  }
  return { safe: true };
}

/**
 * Check if input contains sensitive data.
 */
export function detectSensitiveData(input: string): { safe: boolean; reason?: string } {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(input)) {
      return { safe: false, reason: "Sensitive data detected in input" };
    }
  }
  return { safe: true };
}

/**
 * Sanitize input before sending to AI.
 */
export function sanitizeForAi(input: string): string {
  // Remove potential injection attempts
  let sanitized = input
    .replace(/\b(ignore|forget|override)\s+(all\s+)?(previous|prior|above|instructions)\b/gi, "")
    .replace(/\b(system|user|assistant)\s*:\s*/gi, "")
    .trim();

  // Limit length to prevent token abuse
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }

  return sanitized;
}

/**
 * Validate AI output to ensure it's safe.
 */
export function validateAiOutput(output: string): { valid: boolean; sanitized: string } {
  // Remove HTML tags
  let sanitized = output.replace(/<[^>]*>/g, "");

  // Remove script injections
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Limit length
  if (sanitized.length > 50000) {
    sanitized = sanitized.slice(0, 50000);
  }

  return { valid: true, sanitized };
}

/**
 * Full safety check for user input before AI processing.
 */
export function safetyCheck(input: string): { safe: boolean; errors: string[] } {
  const errors: string[] = [];

  const injection = detectPromptInjection(input);
  if (!injection.safe) errors.push(injection.reason!);

  const sensitive = detectSensitiveData(input);
  if (!sensitive.safe) errors.push(sensitive.reason!);

  return { safe: errors.length === 0, errors };
}
