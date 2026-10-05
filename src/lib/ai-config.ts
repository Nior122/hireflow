export const GROQ_API_URL =
  process.env.GROQ_API_URL?.trim() || "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq model id comes only from the environment (`GROQ_MODEL`).
 * Call this at request time so Next.js picks up runtime env, not a build-time constant.
 */
export function getGroqModel(override?: string): string {
  const model = override?.trim() || process.env.GROQ_MODEL?.trim();
  if (!model) {
    throw new Error("GROQ_MODEL is not set. Configure it in your environment.");
  }
  return model;
}
