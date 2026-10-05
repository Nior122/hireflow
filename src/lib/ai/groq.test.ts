import { groqChatJson, groqFetch, getGroqApiKey, demoAiContent } from "./groq";

describe("groq helpers", () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalDemo = process.env.DEMO_MODE;
  const originalModel = process.env.GROQ_MODEL;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
    if (originalDemo === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = originalDemo;
    if (originalModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = originalModel;
  });

  it("treats missing and placeholder keys as unset", () => {
    delete process.env.GROQ_API_KEY;
    expect(getGroqApiKey()).toBeNull();
    process.env.GROQ_API_KEY = "placeholder";
    expect(getGroqApiKey()).toBeNull();
  });

  it("returns a demo stub in DEMO_MODE without an API key", async () => {
    delete process.env.GROQ_API_KEY;
    process.env.DEMO_MODE = "true";
    const groq = await groqChatJson({
      messages: [
        { role: "system", content: "Be helpful" },
        { role: "user", content: "Which jobs need follow-up?" },
      ],
    });
    expect(groq.ok).toBe(true);
    expect(groq.content).toMatch(/Demo mode/);
    expect(groq.content).toMatch(/follow-up/);
  });

  it("returns JSON demo content when the prompt asks for JSON", () => {
    const content = demoAiContent({
      messages: [{ role: "system", content: "Return JSON: { matchPercentage: 0-100 }" }],
    });
    const parsed = JSON.parse(content);
    expect(parsed.matchPercentage).toBe(72);
  });

  it("errors clearly when Groq is not configured outside demo mode", async () => {
    delete process.env.GROQ_API_KEY;
    process.env.DEMO_MODE = "false";
    const res = await groqFetch({ messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/GROQ_API_KEY/);
  });
});
