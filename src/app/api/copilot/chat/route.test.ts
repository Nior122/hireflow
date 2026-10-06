/** @jest-environment node */

jest.mock("@/lib/clerk", () => ({ requireDbUser: jest.fn() }));
jest.mock("@/lib/copilot/context", () => ({ gatherContext: jest.fn() }));
jest.mock("@/lib/copilot/prompt", () => ({ buildSystemPrompt: jest.fn(() => "system prompt") }));
jest.mock("@/lib/copilot/tools", () => ({
  TOOL_DEFINITIONS: [{ name: "getApplications", description: "Get applications", parameters: { type: "object", properties: {} } }],
  executeTool: jest.fn(),
}));
jest.mock("@/lib/ai/groq", () => ({
  groqFetch: jest.fn(),
  getGroqApiKey: jest.fn(() => "test-key"),
  largerBudgetPayload: jest.fn((payload: Record<string, unknown>) => ({ ...payload, max_tokens: 4096 })),
}));

import { POST } from "./route";
import { requireDbUser } from "@/lib/clerk";
import { gatherContext } from "@/lib/copilot/context";
import { executeTool } from "@/lib/copilot/tools";
import { groqFetch } from "@/lib/ai/groq";

const mockedRequireDbUser = jest.mocked(requireDbUser);
const mockedGatherContext = jest.mocked(gatherContext);
const mockedExecuteTool = jest.mocked(executeTool);
const mockedGroqFetch = jest.mocked(groqFetch);

function sse(events: unknown[]): Response {
  const body = events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
}

function streamText(content: string): Response {
  return sse([
    { choices: [{ delta: { reasoning: "hidden analysis must stay private" } }] },
    { choices: [{ delta: { content } }] },
    { choices: [{ delta: {}, finish_reason: "stop" }] },
  ]);
}

async function callRoute(): Promise<Response> {
  const request = new Request("http://localhost/api/copilot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Show my applications" }] }),
  });
  return POST(request as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  mockedRequireDbUser.mockResolvedValue({ id: "user-1", role: "JOB_SEEKER" } as Awaited<ReturnType<typeof requireDbUser>>);
  mockedGatherContext.mockResolvedValue({ role: "JOB_SEEKER" } as Awaited<ReturnType<typeof gatherContext>>);
  mockedExecuteTool.mockResolvedValue("application rows: [two applications]");
  mockedGroqFetch.mockReset();
});

describe("POST /api/copilot/chat", () => {
  it("streams user-facing text and never forwards provider reasoning", async () => {
    mockedGroqFetch.mockResolvedValueOnce(streamText("Hello from Copilot."));

    const response = await callRoute();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Hello from Copilot.");
    expect(body).not.toContain("hidden analysis must stay private");
    expect(body).toContain("[DONE]");
  });

  it("retries an empty reasoning-model stream with a larger budget", async () => {
    mockedGroqFetch
      .mockResolvedValueOnce(sse([{ choices: [{ delta: {}, finish_reason: "length" }] }]))
      .mockResolvedValueOnce(streamText("Recovered after retry."));

    const response = await callRoute();
    const body = await response.text();

    expect(body).toContain("Recovered after retry.");
    expect(mockedGroqFetch).toHaveBeenCalledTimes(2);
    expect(mockedGroqFetch.mock.calls[1][0]).toMatchObject({ max_tokens: 4096, stream: true });
  });

  it("executes streamed tool calls, returns the result, and supplies that result to the follow-up", async () => {
    mockedGroqFetch
      .mockResolvedValueOnce(sse([
        { choices: [{ delta: { tool_calls: [{ index: 0, id: "call-1", function: { name: "getApplications", arguments: "{}" } }] } }] },
        { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
      ]))
      .mockResolvedValueOnce(streamText("You have two applications."));

    const response = await callRoute();
    const body = await response.text();
    const followUp = mockedGroqFetch.mock.calls[1][0] as { messages: Array<Record<string, unknown>> };

    expect(mockedExecuteTool).toHaveBeenCalledWith("user-1", "getApplications", {}, "JOB_SEEKER");
    expect(body).toContain('"type":"tool_call"');
    expect(body).toContain('"type":"tool_result"');
    expect(body).toContain("application rows: [two applications]");
    expect(body).toContain("You have two applications.");
    expect(followUp.messages).toContainEqual(expect.objectContaining({
      role: "tool",
      content: "application rows: [two applications]",
      tool_call_id: "call-1",
      name: "getApplications",
    }));
    expect(JSON.stringify(followUp.messages)).not.toContain("Tool executed");
  });

  it("sends follow-up provider failures to the chat instead of silently stalling", async () => {
    mockedGroqFetch
      .mockResolvedValueOnce(sse([
        { choices: [{ delta: { tool_calls: [{ index: 0, id: "call-1", function: { name: "getApplications", arguments: "{}" } }] } }] },
        { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
      ]))
      .mockResolvedValueOnce(Response.json({ error: "rate limit exceeded" }, { status: 429 }));

    const response = await callRoute();
    const body = await response.text();

    expect(body).toContain('"type":"error"');
    expect(body).toContain("follow-up answer (429)");
    expect(body).toContain("rate limit exceeded");
  });
});
