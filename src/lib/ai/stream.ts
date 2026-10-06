export interface OpenAIStreamToolCall {
  id: string;
  name: string;
  arguments: string;
  index: number;
}

export interface OpenAIStreamResult {
  content: string;
  toolCalls: OpenAIStreamToolCall[];
  finishReason: string | null;
}

/**
 * Read an OpenAI-compatible SSE chat-completion stream. Only user-facing
 * `delta.content` is surfaced: provider reasoning fields are deliberately
 * ignored so hidden chain-of-thought can never leak into a response stream.
 */
export async function readOpenAICompatibleStream(
  body: ReadableStream<Uint8Array> | null,
  onText?: (text: string) => void,
): Promise<OpenAIStreamResult> {
  const result: OpenAIStreamResult = { content: "", toolCalls: [], finishReason: null };
  if (!body) return result;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const calls = new Map<number, OpenAIStreamToolCall>();
  let buffer = "";
  let doneEvent = false;

  const consumeData = (rawData: string) => {
    const data = rawData.trim();
    if (!data || data === "[DONE]") {
      if (data === "[DONE]") doneEvent = true;
      return;
    }

    let parsed: {
      choices?: Array<{
        delta?: {
          content?: unknown;
          tool_calls?: Array<{
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
        finish_reason?: string | null;
      }>;
    };
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    const choice = parsed.choices?.[0];
    if (!choice) return;
    if (choice.finish_reason !== undefined) result.finishReason = choice.finish_reason;

    const delta = choice.delta;
    if (!delta) return;

    if (typeof delta.content === "string" && delta.content.length > 0) {
      result.content += delta.content;
      onText?.(delta.content);
    }

    for (const streamedCall of delta.tool_calls ?? []) {
      const index = Number.isInteger(streamedCall.index) ? streamedCall.index! : 0;
      let call = calls.get(index);
      if (!call) {
        call = { id: streamedCall.id ?? `call_${index}`, name: "", arguments: "", index };
        calls.set(index, call);
      }
      if (streamedCall.id) call.id = streamedCall.id;
      if (typeof streamedCall.function?.name === "string") call.name += streamedCall.function.name;
      if (typeof streamedCall.function?.arguments === "string") call.arguments += streamedCall.function.arguments;
    }
  };

  const consumeLine = (rawLine: string) => {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line.startsWith("data:")) return;
    consumeData(line.slice(5).replace(/^ /, ""));
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) consumeLine(line);
      if (doneEvent) break;
    }

    buffer += decoder.decode();
    if (buffer) consumeLine(buffer);
  } finally {
    reader.releaseLock();
  }

  result.toolCalls = [...calls.values()].sort((a, b) => a.index - b.index);
  return result;
}
