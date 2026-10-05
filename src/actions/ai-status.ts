'use server';

import { createOrGetUser } from '@/lib/clerk';
import { getGroqApiKey } from '@/lib/ai/groq';
import { getGroqModel } from '@/lib/ai-config';

/** Safe runtime diagnostics; never return credentials. Model IDs are public identifiers. */
export async function getAiConfigurationStatus() {
  await createOrGetUser();
  let model: string | null = null;
  try { model = getGroqModel(); } catch { /* missing at runtime */ }
  return {
    keyConfigured: Boolean(getGroqApiKey()),
    modelConfigured: Boolean(model),
    model,
    environment: process.env.VERCEL_ENV ?? 'local',
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}

/** Fetch actual account-accessible models from Groq, not a static marketing list. */
export async function getAvailableGroqModels(): Promise<{ models: string[]; error?: string }> {
  await createOrGetUser();
  const key = getGroqApiKey();
  if (!key) return { models: [], error: 'GROQ_API_KEY is unavailable on this deployment.' };
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000), cache: 'no-store',
    });
    if (!response.ok) return { models: [], error: `Groq model lookup failed (HTTP ${response.status}).` };
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('data' in data) || !Array.isArray(data.data))
      return { models: [], error: 'Groq returned an unexpected model list.' };
    const models = data.data
      .filter((item: unknown): item is { id: string; active?: boolean } => !!item && typeof item === 'object' &&
        'id' in item && typeof item.id === 'string' && item.id.length < 150 &&
        (!('active' in item) || item.active !== false))
      .map((item: { id: string }) => item.id)
      .sort();
    return { models };
  } catch { return { models: [], error: 'Groq model lookup timed out or is unavailable.' }; }
}
