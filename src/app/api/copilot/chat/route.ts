import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOrGetUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { gatherContext } from "@/lib/copilot/context";
import { buildSystemPrompt, buildUserMessage } from "@/lib/copilot/prompt";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/copilot/tools";
import { GROQ_API_URL, GROQ_MODEL } from "@/lib/ai-config";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return new Response(JSON.stringify({ error: "AI service not configured. Set GROQ_API_KEY." }), { status: 500 });
  }

  try {
    const user = await createOrGetUser();
    const body = await req.json();
    const { messages, conversationId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages required", { status: 400 });
    }

    const context = await gatherContext(user.id, user.role);
    const systemPrompt = buildSystemPrompt(context);

    // Build messages for Groq
    const groqMessages: Array<{ role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string }> = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20).map((m: { role: string; content: string; toolCalls?: unknown[]; toolCallId?: string; name?: string }) => {
        const msg: { role: string; content: string; tool_calls?: unknown[]; tool_call_id?: string; name?: string } = {
          role: m.role,
          content: m.content,
        };
        if (m.toolCalls) msg.tool_calls = m.toolCalls;
        if (m.toolCallId) msg.tool_call_id = m.toolCallId;
        if (m.name) msg.name = m.name;
        return msg;
      }),
    ];

    // Use Groq with streaming and tool use
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: groqMessages,
        tools: TOOL_DEFINITIONS.map(t => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
        tool_choice: "auto",
        temperature: 0.3,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq API error:", err);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 502 });
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        const decoder = new TextDecoder();
        let buffer = "";
        let contentBuffer = "";
        const toolCallsBuffer: Array<{ id: string; name: string; arguments: string }> = [];
        let hasToolCalls = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const choice = parsed.choices?.[0];
                if (!choice) continue;

                const delta = choice.delta;
                if (!delta) continue;

                // Handle tool calls
                if (delta.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    if (tc.index !== undefined) {
                      if (!toolCallsBuffer[tc.index]) {
                        toolCallsBuffer[tc.index] = {
                          id: tc.id ?? `call_${tc.index}`,
                          name: tc.function?.name ?? "",
                          arguments: "",
                        };
                      }
                      if (tc.function?.name) toolCallsBuffer[tc.index].name = tc.function.name;
                      if (tc.function?.arguments) toolCallsBuffer[tc.index].arguments += tc.function.arguments;
                    }
                  }
                }

                // Handle content
                if (delta.content) {
                  contentBuffer += delta.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`));
                }

                if (choice.finish_reason === "stop" && contentBuffer) {
                  hasToolCalls = false;
                }
              } catch {}
            }
          }

          // Process tool calls if any
          if (toolCallsBuffer.length > 0) {
            hasToolCalls = true;
            for (const tc of toolCallsBuffer.filter(t => t.name)) {
              try {
                let args = {};
                try { args = JSON.parse(tc.arguments); } catch {}

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", name: tc.name, args })}\n\n`));

                const result = await executeTool(user.id, tc.name, args as Record<string, string>, user.role);

                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_result", name: tc.name, result })}\n\n`));
              } catch (e) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_error", name: tc.name, error: "Tool execution failed" })}\n\n`));
              }
            }

            // Re-run with tool results for final answer
            groqMessages.push(
              { role: "assistant", content: contentBuffer || "", tool_calls: toolCallsBuffer.map(t => ({ id: t.id, type: "function", function: { name: t.name, arguments: t.arguments } })) },
              ...toolCallsBuffer.filter(t => t.name).map(t => {
                const resultStr = "";
                try {
                  let args = {};
                  try { args = JSON.parse(t.arguments); } catch {}
                  // Result already executed above; re-fetch
                  return { role: "tool" as const, content: "Tool executed", tool_call_id: t.id, name: t.name };
                } catch { return { role: "tool" as const, content: "Error", tool_call_id: t.id, name: t.name }; }
              })
            );

            // Stream follow-up response
            const followUp = await fetch(GROQ_API_URL, {
              method: "POST",
              headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: GROQ_MODEL,
                messages: groqMessages,
                temperature: 0.3,
                max_tokens: 2048,
                stream: true,
              }),
            });

            if (followUp.ok) {
              const fuReader = followUp.body?.getReader();
              if (fuReader) {
                const fuDecoder = new TextDecoder();
                let fuBuffer = "";
                while (true) {
                  const { done, value } = await fuReader.read();
                  if (done) break;
                  fuBuffer += fuDecoder.decode(value, { stream: true });
                  const fuLines = fuBuffer.split("\n");
                  fuBuffer = fuLines.pop() ?? "";
                  for (const line of fuLines) {
                    if (!line.startsWith("data: ")) continue;
                    const d = line.slice(6).trim();
                    if (d === "[DONE]") continue;
                    try {
                      const p = JSON.parse(d);
                      const c = p.choices?.[0]?.delta?.content;
                      if (c) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: c })}\n\n`));
                    } catch {}
                  }
                }
              }
            }
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (e) {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("Copilot error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
}
