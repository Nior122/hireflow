'use server';

import { createOrGetUser } from '@/lib/clerk';
import { getGroqApiKey } from '@/lib/ai/groq';
import { getGroqModel } from '@/lib/ai-config';

/** Safe runtime diagnostics; never return credentials or a model identifier. */
export async function getAiConfigurationStatus() {
  await createOrGetUser();
  let modelConfigured = false;
  try { modelConfigured = Boolean(getGroqModel()); } catch { /* missing at runtime */ }
  return {
    keyConfigured: Boolean(getGroqApiKey()),
    modelConfigured,
    environment: process.env.VERCEL_ENV ?? 'local',
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}
