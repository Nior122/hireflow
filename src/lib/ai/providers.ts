/**
 * Multi-provider AI abstraction layer.
 * Allows switching between Groq, OpenAI, Anthropic, etc.
 */

import { plainGroqReply } from "@/lib/ai/plain";
import { groqChatJson, groqFetch, largerBudgetPayload } from "@/lib/ai/groq";
import { readOpenAICompatibleStream } from "@/lib/ai/stream";

export interface AIProvider {
  id: string;
  name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

async function providerError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body);
    const error = parsed?.error;
    if (typeof error === "string") return error;
    if (error && typeof error.message === "string") return error.message;
    return JSON.stringify(error ?? parsed);
  } catch {
    return body.trim().slice(0, 500) || "AI service error";
  }
}

export class OpenAICompatibleProvider implements AIProvider {
  id = "configured";
  name = "Configured AI provider";

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const result = await groqChatJson({
      model: options?.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
    });

    if (!result.ok) throw new Error(result.error ?? `AI provider error (${result.status})`);
    if (!result.content.trim()) throw new Error("AI provider returned an empty response.");
    return result.content;
  }

  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const payload: Record<string, unknown> = {
      model: options?.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
    };

    let response = await groqFetch(payload);
    if (!response.ok) throw new Error(`AI provider error (${response.status}): ${await providerError(response)}`);
    let result = await readOpenAICompatibleStream(response.body);

    if (!result.content.trim()) {
      const retryPayload = largerBudgetPayload(payload);
      if (retryPayload) {
        response = await groqFetch(retryPayload);
        if (!response.ok) throw new Error(`AI provider retry error (${response.status}): ${await providerError(response)}`);
        result = await readOpenAICompatibleStream(response.body);
      }
    }

    if (!result.content.trim()) {
      const reason = result.finishReason ? ` (finish_reason: ${result.finishReason})` : "";
      throw new Error(`AI provider returned an empty streamed response${reason}.`);
    }
    yield plainGroqReply(result.content);
  }
}

const providers = new Map<string, AIProvider>();

export function registerProvider(provider: AIProvider) {
  providers.set(provider.id, provider);
}

export function getProvider(id?: string): AIProvider {
  const providerId = id ?? "configured";
  const provider = providers.get(providerId);
  if (!provider) throw new Error(`AI provider ${providerId} not registered`);
  return provider;
}

registerProvider(new OpenAICompatibleProvider());

/** Backwards-compatible alias used by existing extraction code. */
export { OpenAICompatibleProvider as GroqProvider };
