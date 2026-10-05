'use server';

import { createOrGetUser } from '@/lib/clerk';
import { getAiConnection, getAiConfigurationStatus as readConfiguration } from '@/lib/ai-config';

/** Safe runtime diagnostics: no credentials returned. */
export async function getAiConfigurationStatus() {
  await createOrGetUser();
  const status = readConfiguration();
  return {
    keyConfigured: (() => { try { return Boolean(getAiConnection().apiKey); } catch { return false; } })(),
    modelConfigured: status.configured,
    model: status.model,
    provider: status.provider,
    error: status.error,
    environment: process.env.VERCEL_ENV ?? 'local',
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}

/** Live models available to the configured provider key, never fake marketing cards. */
export async function getAvailableAiModels(): Promise<{ models: string[]; error?: string }> {
  await createOrGetUser();
  let config;
  try { config = getAiConnection(); }
  catch (e) { return { models: [], error: e instanceof Error ? e.message : 'AI is not configured' }; }
  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(10000), cache: 'no-store',
    });
    if (!response.ok) return { models: [], error: `Model lookup failed (HTTP ${response.status}).` };
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('data' in data) || !Array.isArray(data.data))
      return { models: [], error: 'Provider returned an unexpected model list.' };
    const models = data.data
      .filter((item: unknown): item is { id: string; active?: boolean } => !!item && typeof item === 'object' &&
        'id' in item && typeof item.id === 'string' && item.id.length < 150 &&
        (!('active' in item) || item.active !== false))
      .map((item: { id: string }) => item.id).sort();
    return { models };
  } catch { return { models: [], error: 'Provider model lookup timed out or is unavailable.' }; }
}

/** Real, small completion through the same transport used by Copilot and resume AI. */
export async function testAiConnection(): Promise<{ ok: boolean; message: string }> {
  await createOrGetUser();
  const { getAiConfig } = await import('@/lib/ai-config');
  const { groqChatJson } = await import('@/lib/ai/groq');
  try {
    const config = getAiConfig();
    const reply = await groqChatJson({
      messages: [{ role: 'user', content: 'Reply with the single word READY.' }],
      max_tokens: 12, temperature: 0,
    });
    if (!reply.ok) return { ok: false, message: `${config.provider} request failed (HTTP ${reply.status}): ${reply.error ?? 'Unknown provider error'}`.slice(0, 300) };
    if (!reply.content.trim()) return { ok: false, message: `${config.provider} returned an empty reply. Check the model's chat-completion support.` };
    return { ok: true, message: `${config.provider} responded using ${config.model}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'AI connection test failed' };
  }
}
