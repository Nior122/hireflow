/** Server-only OpenAI-compatible provider configuration. Never expose credentials to clients. */
type Provider = 'groq' | 'openrouter' | 'openai' | 'custom';
export interface AiConfig { provider: Provider; apiKey: string; model: string; baseUrl: string; }
const BASE_URLS: Record<Exclude<Provider, 'custom'>, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
};
const KEYS: Record<Provider, string> = {
  groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY', openai: 'OPENAI_API_KEY', custom: 'AI_API_KEY',
};
const MODELS: Record<Provider, string> = {
  groq: 'GROQ_MODEL', openrouter: 'OPENROUTER_MODEL', openai: 'OPENAI_MODEL', custom: 'AI_MODEL',
};
const configured = (name: string) => {
  const value = process.env[name]?.trim();
  return value && value !== 'placeholder' ? value : null;
};
export function getAiConnection(): Omit<AiConfig, 'model'> {
  const explicit = configured('AI_PROVIDER')?.toLowerCase();
  if (explicit && !['groq', 'openrouter', 'openai', 'custom'].includes(explicit)) throw new Error('AI_PROVIDER must be groq, openrouter, openai, or custom');
  const candidates = (Object.keys(KEYS) as Provider[]).filter(p => configured(KEYS[p]));
  if (!explicit && candidates.length > 1) throw new Error('Multiple AI providers configured. Set AI_PROVIDER to choose one.');
  const provider = (explicit ?? candidates[0] ?? 'groq') as Provider;
  const apiKey = configured(KEYS[provider]);
  if (!apiKey) throw new Error(`${KEYS[provider]} is not set for ${provider}`);
  const rawBaseUrl = provider === 'custom' ? configured('AI_BASE_URL') : BASE_URLS[provider];
  if (!rawBaseUrl) throw new Error('AI_BASE_URL is required for custom provider');
  const base = new URL(rawBaseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('AI_BASE_URL must be a secure HTTPS API origin/path');
  // All provider URLs are server-owned config, never supplied from requests.
  return { provider, apiKey, baseUrl: base.toString().replace(/\/$/, '') };
}
export function getAiConfig(): AiConfig {
  const connection = getAiConnection();
  const model = configured('AI_MODEL') ?? configured(MODELS[connection.provider]);
  if (!model) throw new Error(`AI_MODEL or ${MODELS[connection.provider]} is not set for ${connection.provider}`);
  return { ...connection, model };
}
export function getAiConfigurationStatus() {
  // Report the provider even when only part of its configuration is present, so a
  // missing model can be named against the provider that was actually inferred.
  let label: string = configured('AI_PROVIDER')?.toLowerCase() ?? 'auto';
  let model: string | null = null;
  try {
    const connection = getAiConnection();
    label = connection.provider;
    model = configured('AI_MODEL') ?? configured(MODELS[connection.provider]) ?? null;
    if (!model) throw new Error(`AI_MODEL or ${MODELS[connection.provider]} is not set for ${connection.provider}`);
    return { provider: label, model, configured: true as const, error: null };
  }
  catch (e) { return { provider: label, model, configured: false as const, error: e instanceof Error ? e.message : 'AI not configured' }; }
}
