export const GROQ_API_URL =
  process.env.GROQ_API_URL?.trim() || "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq model id comes only from GROQ_MODEL (or an explicit override).
 * Nothing is hardcoded — set GROQ_MODEL in the environment.
 */
export function getGroqModel(override?: string): string {
  const model = override?.trim() || process.env.GROQ_MODEL?.trim();
  if (!model) {
    throw new Error("GROQ_MODEL is not set");
  }
  return model;
}
