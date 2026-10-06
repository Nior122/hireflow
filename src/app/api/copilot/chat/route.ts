import { NextRequest } from "next/server";
import { requireDbUser } from "@/lib/clerk";
import { gatherContext } from "@/lib/copilot/context";
import { buildSystemPrompt } from "@/lib/copilot/prompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/copilot/tools";
import { groqFetch, getGroqApiKey, largerBudgetPayload } from "@/lib/ai/groq";
import { readOpenAICompatibleStream, type OpenAIStreamToolCall } from "@/lib/ai/stream";
import { plainGroqReply } from "@/lib/ai/plain";

export const maxDuration = 60;

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

async function responseError(response: Response): Promise<string> {
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

function parseToolArguments(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Invalid model arguments are returned to the model as a tool error below.
  }
  return null;
}

async function readStreamWithEmptyRetry(
  response: Response,
  payload: Record<string, unknown>,
  timeoutMs = 45_000,
): Promise<{ content: string; toolCalls: OpenAIStreamToolCall[]; finishReason: string | null; error?: string }> {
  let result = await readOpenAICompatibleStream(response.body);
  if (result.content.trim() || result.toolCalls.length > 0) return result;

  const retryPayload = largerBudgetPayload(payload);
  if (!retryPayload) {
    const reason = result.finishReason ? ` (finish_reason: ${result.finishReason})` : "";
    return {
      ...result,
      error: `The AI provider returned an empty response${reason} after reaching its token budget. Please try again.`,
    };
  }

  const retry = await groqFetch(retryPayload, { timeoutMs });
  if (!retry.ok) return { ...result, error: `AI retry failed (${retry.status}): ${await responseError(retry)}` };
  result = await readOpenAICompatibleStream(retry.body);
  if (!result.content.trim() && result.toolCalls.length === 0) {
    const reason = result.finishReason ? ` (finish_reason: ${result.finishReason})` : "";
    return {
      ...result,
      error: `The AI provider returned an empty response${reason} after retrying with a larger token budget. Please try again.`,
    };
  }
  return result;
}

export async function POST(req: NextRequest) {
  const user = await requireDbUser();
  if (!user) return Response.json({ error: "Please sign in to use Copilot." }, { status: 401 });

  if (!getGroqApiKey() && process.env.DEMO_MODE !== "true") {
    return Response.json({ error: "AI provider is not configured. Check AI settings and Vercel environment variables." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { messages, conversationId } = body;
    void conversationId;

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages required" }, { status: 400 });
    }

    let context;
    try {
      context = await gatherContext(user.id, user.role);
    } catch (err) {
      console.error("Copilot context error:", err);
      context = { role: user.role };
    }

    const systemPrompt = buildSystemPrompt(context);
    const history: ChatMessage[] = messages.slice(-20).flatMap((message: unknown) => {
      if (!message || typeof message !== "object") return [];
      const candidate = message as { role?: unknown; content?: unknown };
      if (
        (candidate.role !== "user" && candidate.role !== "assistant") ||
        typeof candidate.content !== "string"
      ) return [];
      return [{ role: candidate.role, content: candidate.content }];
    });
    const groqMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
    ];

    const requestPayload: Record<string, unknown> = {
      messages: groqMessages,
      tools: TOOL_DEFINITIONS.map(tool => ({
        type: "function",
        function: { name: tool.name, description: tool.description, parameters: tool.parameters },
      })),
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 2048,
      stream: true,
    };

    const response = await groqFetch(requestPayload, { timeoutMs: 45_000 });
    if (!response.ok) {
      const detail = await responseError(response);
      console.error("AI provider error:", detail);
      return Response.json({ error: detail }, { status: response.status });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          const completion = await readStreamWithEmptyRetry(response, requestPayload, 45_000);
          if (completion.error) {
            emit({ type: "error", error: completion.error });
          } else {
            if (completion.content.trim()) {
              emit({ type: "text", content: plainGroqReply(completion.content) });
            }

            const toolCalls = completion.toolCalls.filter(call => call.name.trim());
            if (toolCalls.length > 0) {
              const toolMessages: ChatMessage[] = [];
              const assistantToolCalls = toolCalls.map(call => ({
                id: call.id,
                type: "function" as const,
                function: { name: call.name, arguments: call.arguments },
              }));

              for (const call of toolCalls) {
                const args = parseToolArguments(call.arguments);
                emit({ type: "tool_call", id: call.id, index: call.index, name: call.name, args: args ?? {} });

                if (!args) {
                  const error = "The tool arguments were invalid.";
                  emit({ type: "tool_error", id: call.id, name: call.name, error });
                  toolMessages.push({ role: "tool", content: error, tool_call_id: call.id, name: call.name });
                  continue;
                }

                try {
                  const result = await executeTool(user.id, call.name, args as Record<string, string>, user.role);
                  emit({ type: "tool_result", id: call.id, name: call.name, result });
                  // Pass the actual tool output to the model so its answer uses real data.
                  toolMessages.push({ role: "tool", content: result, tool_call_id: call.id, name: call.name });
                } catch (err) {
                  console.error(`Copilot tool ${call.name} failed:`, err);
                  const error = "Tool execution failed.";
                  emit({ type: "tool_error", id: call.id, name: call.name, error });
                  toolMessages.push({ role: "tool", content: error, tool_call_id: call.id, name: call.name });
                }
              }

              const followUpMessages: ChatMessage[] = [
                ...groqMessages,
                {
                  role: "assistant",
                  content: completion.content || "",
                  tool_calls: assistantToolCalls,
                },
                ...toolMessages,
              ];
              const followUpPayload: Record<string, unknown> = {
                messages: followUpMessages,
                temperature: 0.3,
                max_tokens: 2048,
                stream: true,
              };

              const followUp = await groqFetch(followUpPayload, { timeoutMs: 45_000 });
              if (!followUp.ok) {
                const detail = await responseError(followUp);
                emit({
                  type: "error",
                  error: `The tool finished, but I couldn't generate the follow-up answer (${followUp.status}): ${detail}`,
                });
              } else {
                const followUpCompletion = await readStreamWithEmptyRetry(followUp, followUpPayload, 45_000);
                if (followUpCompletion.error) {
                  emit({ type: "error", error: `The tool finished, but ${followUpCompletion.error}` });
                } else if (followUpCompletion.content.trim()) {
                  emit({ type: "text", content: plainGroqReply(followUpCompletion.content) });
                } else {
                  emit({ type: "error", error: "The tool finished, but the AI provider returned no follow-up answer." });
                }
              }
            }
          }
        } catch (err) {
          console.error("Copilot stream error:", err);
          const detail = err instanceof Error ? err.message : "Unknown AI response error";
          emit({ type: "error", error: `Copilot could not finish the response: ${detail}` });
        } finally {
          emit({ type: "done" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("Copilot error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
