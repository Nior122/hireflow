#!/usr/bin/env node
/**
 * Real connection test for the configured AI provider.
 *
 * Resolves the provider the same way the app does (it imports src/lib/ai-config.ts
 * directly, so there is a single source of truth), then:
 *   1. reports which provider/model the environment resolves to,
 *   2. lists the models the key can actually see,
 *   3. performs one real chat completion through that provider.
 *
 * Usage:  npm run ai:check
 *
 * Reads the environment (or .env.local / .env if present). The API key is sent to
 * the provider and is never printed, logged, or included in the output.
 *
 * Run with: node --experimental-strip-types scripts/ai-connection-check.mjs
 */
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* optional; the real environment is normally already set */
  }
}

const REDACTED = "***redacted***";

function redact(value, source) {
  if (!value) return source;
  return source.split(value).join(REDACTED);
}

const { getAiConfig, getAiConfigurationStatus } = await import(
  new URL("../src/lib/ai-config.ts", import.meta.url).href
);

const status = getAiConfigurationStatus();

console.log("HireFlow AI connection check");
console.log("─────────────────────────────────────────────");
console.log(`provider   : ${status.provider}`);
console.log(`configured : ${status.configured}`);
console.log(`model      : ${status.model ?? "(none)"}`);

if (!status.configured) {
  console.log(`error      : ${status.error}`);
  console.log("─────────────────────────────────────────────");
  console.error("FAILED: the environment does not resolve to a provider and model.");
  console.error("Set the provider key AND its model variable (for example GROQ_API_KEY + GROQ_MODEL)");
  console.error("in the Vercel environment you are deploying, then redeploy so the build sees them.");
  process.exit(1);
}

const config = getAiConfig();
const failures = [];

async function callProvider(path, body) {
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* non-JSON error bodies are reported verbatim, with the key redacted */
  }
  return { response, text, parsed };
}

// 1. Which models does this key actually see? Proves the key is valid and that the
//    configured model id exists on the provider (no hard-coded model list anywhere).
const models = await callProvider("/models");
if (!models.response.ok) {
  const detail = models.parsed?.error?.message ?? models.text.slice(0, 200);
  failures.push(`model listing failed (HTTP ${models.response.status}): ${redact(config.apiKey, detail)}`);
  console.log(`models     : lookup failed (HTTP ${models.response.status})`);
} else {
  const ids = (models.parsed?.data ?? [])
    .filter(m => m && typeof m.id === "string" && (!("active" in m) || m.active !== false))
    .map(m => m.id);
  console.log(`models     : ${ids.length} available to this key`);
  console.log(`model id ok: ${ids.includes(config.model)}`);
  if (!ids.includes(config.model)) {
    failures.push(`configured model "${config.model}" is not in the ${config.provider} model list for this key`);
  }
}

// 2. One real completion, exactly the shape Copilot / resume AI / interview AI use.
const completion = await callProvider("/chat/completions", {
  model: config.model,
  messages: [{ role: "user", content: "Reply with the single word READY." }],
  max_tokens: 16,
  temperature: 0,
});

if (!completion.response.ok) {
  const detail = completion.parsed?.error?.message ?? completion.text.slice(0, 200);
  failures.push(`completion failed (HTTP ${completion.response.status}): ${redact(config.apiKey, detail)}`);
  console.log(`completion : failed (HTTP ${completion.response.status})`);
} else {
  const reply = completion.parsed?.choices?.[0]?.message?.content ?? "";
  console.log(`completion : ok`);
  console.log(`reply      : ${JSON.stringify(reply.trim().slice(0, 120))}`);
  if (!reply.trim()) failures.push(`${config.provider} returned an empty reply for ${config.model}`);
}

console.log("─────────────────────────────────────────────");
if (failures.length) {
  for (const failure of failures) console.error(`FAILED: ${redact(config.apiKey, failure)}`);
  process.exit(1);
}
console.log(`PASSED: ${config.provider} responded using ${config.model}.`);
