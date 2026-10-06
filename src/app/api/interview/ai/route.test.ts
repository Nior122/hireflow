/** @jest-environment node */

jest.mock("@/lib/clerk", () => ({ requireDbUser: jest.fn() }));
jest.mock("@/lib/ai/groq", () => ({
  groqChatJson: jest.fn(),
  getGroqApiKey: jest.fn(() => "test-key"),
}));

import { POST } from "./route";
import { requireDbUser } from "@/lib/clerk";
import { groqChatJson } from "@/lib/ai/groq";

const mockedRequireDbUser = jest.mocked(requireDbUser);
const mockedGroqChatJson = jest.mocked(groqChatJson);

async function callRoute(body: unknown): Promise<Response> {
  const request = new Request("http://localhost/api/interview/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request as Parameters<typeof POST>[0]);
}

beforeEach(() => {
  mockedRequireDbUser.mockResolvedValue({ id: "user-1" } as Awaited<ReturnType<typeof requireDbUser>>);
  mockedGroqChatJson.mockReset();
});

describe("POST /api/interview/ai", () => {
  it("generates the learning report action already used by the interview UI", async () => {
    mockedGroqChatJson.mockResolvedValue({ ok: true, status: 200, content: "Strengths: clear ownership.\nNext steps: quantify impact." });
    const transcript = "assistant: Tell me about a project.\n\nuser: I led a migration.";

    const response = await callRoute({
      action: "generate_learning_report",
      data: { role: "Engineer", company: "Example Co", jobRequirements: "Distributed systems", score: 82, transcript },
    });
    const body = await response.json();
    const prompt = mockedGroqChatJson.mock.calls[0][0] as { messages: Array<{ content: string }> };

    expect(response.status).toBe(200);
    expect(body.result).toContain("Strengths:");
    expect(prompt.messages[1].content).toContain(transcript);
    expect(prompt.messages[1].content).toContain("Distributed systems");
  });

  it("passes the full interview transcript and strict follow-up rules to the model", async () => {
    mockedGroqChatJson.mockResolvedValue({ ok: true, status: 200, content: "You mentioned a 30% improvement.\nHow did you measure that outcome?" });
    const transcript = [
      { role: "assistant", content: "Describe a project you led?" },
      { role: "user", content: "I led a migration that improved latency by 30%." },
    ];

    const response = await callRoute({
      action: "mock_interview_continue",
      data: { previousQuestion: "Describe a project you led?", answer: "I led a migration that improved latency by 30%.", questionNumber: 1, transcript },
    });
    const body = await response.json();
    const messages = mockedGroqChatJson.mock.calls[0][0].messages;

    expect(response.status).toBe(200);
    expect(body.result).toContain("How did you measure");
    expect(messages[0].content).toMatch(/specific detail/i);
    expect(messages[0].content).toMatch(/Never repeat/i);
    expect(messages[0].content).toMatch(/on its own line/i);
    expect(messages[1].content).toContain("latency by 30%");
    expect(messages[1].content).toContain("assistant: Describe a project you led?");
  });

  it("returns the provider's empty-response failure as a 502", async () => {
    mockedGroqChatJson.mockResolvedValue({ ok: false, status: 502, content: "", error: "The AI provider returned an empty response." });

    const response = await callRoute({ action: "mock_interview_start", data: {} });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toMatch(/empty response/);
  });
});
