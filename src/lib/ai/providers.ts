/**
 * Multi-provider AI abstraction layer.
 * Allows switching between Groq, OpenAI, Anthropic, etc.
 */

import { plainGroqReply } from "@/lib/ai/plain";
import { groqFetch } from "@/lib/ai/groq";

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

export class OpenAICompatibleProvider implements AIProvider {
  id = "configured";
  name = "Configured AI provider";

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const response = await groqFetch({
      model: options?.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
    });

    if (!response.ok) throw new Error(`AI provider error: ${response.status}`);
    const data = await response.json();
    return plainGroqReply(data.choices?.[0]?.message?.content ?? "");
  }

  async *streamChat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string> {
    const response = await groqFetch({
      model: options?.model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
    });

    if (!response.ok) throw new Error(`AI provider error: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) fullText += content;
        } catch {}
      }
    }
    if (buffer.startsWith("data: ")) { try { fullText += JSON.parse(buffer.slice(6)).choices?.[0]?.delta?.content ?? ""; } catch {} }
    if (fullText) yield plainGroqReply(fullText);
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
