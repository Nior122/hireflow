import { groqChatJson, groqFetch, getGroqApiKey, demoAiContent } from "./groq";

describe("groq helpers", () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalDemo = process.env.DEMO_MODE;
  const originalModel = process.env.GROQ_MODEL;

  const otherVars = ["AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "OPENROUTER_API_KEY", "OPENAI_API_KEY"] as const;
  const originalOthers = Object.fromEntries(otherVars.map(name => [name, process.env[name]]));
  beforeEach(() => { for (const name of otherVars) delete process.env[name]; });
  afterEach(() => {
    for (const name of otherVars) { if (originalOthers[name] === undefined) delete process.env[name]; else process.env[name] = originalOthers[name]; }
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
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/GROQ_API_KEY/);
  });
});

describe("provider transport", () => {
  const keys = ["AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "AI_BASE_URL", "GROQ_API_KEY", "GROQ_MODEL", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"] as const;
  const previous = Object.fromEntries(keys.map(value => [value, process.env[value]]));
  const fetchBefore = global.fetch;
  beforeEach(() => { for (const key of keys) delete process.env[key]; });
  afterEach(() => {
    global.fetch = fetchBefore;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it.each([
    ["groq", "GROQ_API_KEY", "GROQ_MODEL", "https://api.groq.com/openai/v1/chat/completions"],
    ["openrouter", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "https://openrouter.ai/api/v1/chat/completions"],
    ["openai", "OPENAI_API_KEY", "OPENAI_MODEL", "https://api.openai.com/v1/chat/completions"],
    ["custom", "AI_API_KEY", "AI_MODEL", "https://custom.example/v1/chat/completions"],
  ])("routes %s calls using configured credentials and model", async (provider, keyVar, modelVar, url) => {
    process.env.AI_PROVIDER = provider as string;
    if (provider === "custom") process.env.AI_BASE_URL = "https://custom.example/v1";
    process.env[keyVar as string] = "private-test-key";
    process.env[modelVar as string] = "runtime-model";
    const mock = jest.fn(async () => Response.json({ choices: [{ message: { content: "Hello" } }] }));
    global.fetch = mock as unknown as typeof fetch;
    const result = await groqChatJson({ messages: [{ role: "user", content: "hello" }], model: "untrusted-request-model" });
    expect(result.ok).toBe(true);
    expect(mock).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer private-test-key" }),
        body: expect.stringContaining('"model":"runtime-model"'),
      }),
    );
  });

  it("expands Groq token budgets and requests hidden reasoning by default", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "private-test-key";
    process.env.GROQ_MODEL = "configured-model";
    const mock = jest.fn(async () => Response.json({ choices: [{ message: { content: "Ready" } }] }));
    global.fetch = mock as unknown as typeof fetch;

    await groqFetch({ messages: [{ role: "user", content: "hello" }], max_tokens: 2048 });

    const sent = JSON.parse(String((mock.mock.calls[0][1] as RequestInit).body));
    expect(sent).toMatchObject({ model: "configured-model", max_tokens: 6144, reasoning_effort: "low", reasoning_format: "hidden" });
  });

  it("caps the expanded Groq token budget at 8192", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "private-test-key";
    process.env.GROQ_MODEL = "configured-model";
    const mock = jest.fn(async () => Response.json({ choices: [{ message: { content: "Ready" } }] }));
    global.fetch = mock as unknown as typeof fetch;

    await groqFetch({ messages: [{ role: "user", content: "hello" }], max_tokens: 5000 });

    const sent = JSON.parse(String((mock.mock.calls[0][1] as RequestInit).body));
    expect(sent.max_tokens).toBe(8192);
  });

  it("retries a 400 without unsupported reasoning parameters", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "private-test-key";
    process.env.GROQ_MODEL = "configured-model";
    const mock = jest.fn()
      .mockResolvedValueOnce(Response.json({ error: { message: "unsupported reasoning_format" } }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "Ready" } }] }));
    global.fetch = mock as unknown as typeof fetch;

    const response = await groqFetch({ messages: [{ role: "user", content: "hello" }], max_tokens: 1500 });

    expect(response.ok).toBe(true);
    expect(mock).toHaveBeenCalledTimes(2);
    const first = JSON.parse(String((mock.mock.calls[0][1] as RequestInit).body));
    const retry = JSON.parse(String((mock.mock.calls[1][1] as RequestInit).body));
    expect(first).toHaveProperty("reasoning_effort", "low");
    expect(first).toHaveProperty("reasoning_format", "hidden");
    expect(retry).not.toHaveProperty("reasoning_effort");
    expect(retry).not.toHaveProperty("reasoning_format");
    expect(retry.max_tokens).toBe(4500);
  });

  it("retries an empty completion with a larger budget", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "private-test-key";
    process.env.GROQ_MODEL = "configured-model";
    const mock = jest.fn()
      .mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: "length", message: { content: "" } }] }))
      .mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: "stop", message: { content: "Recovered answer" } }] }));
    global.fetch = mock as unknown as typeof fetch;

    const result = await groqChatJson({ messages: [{ role: "user", content: "hello" }], max_tokens: 1500 });

    expect(result).toMatchObject({ ok: true, content: "Recovered answer" });
    expect(mock).toHaveBeenCalledTimes(2);
    const first = JSON.parse(String((mock.mock.calls[0][1] as RequestInit).body));
    const retry = JSON.parse(String((mock.mock.calls[1][1] as RequestInit).body));
    expect(first.max_tokens).toBe(4500);
    expect(retry.max_tokens).toBeGreaterThan(first.max_tokens);
    expect(retry.max_tokens).toBeLessThanOrEqual(8192);
  });

  it("returns a clear 502 when both completion attempts are empty", async () => {
    process.env.AI_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "private-test-key";
    process.env.GROQ_MODEL = "configured-model";
    const emptyResponse = () => Response.json({ choices: [{ finish_reason: "length", message: { content: "" } }] });
    const mock = jest.fn().mockResolvedValueOnce(emptyResponse()).mockResolvedValueOnce(emptyResponse());
    global.fetch = mock as unknown as typeof fetch;

    const result = await groqChatJson({ messages: [{ role: "user", content: "hello" }], max_tokens: 1500 });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(result.error).toMatch(/empty response.*finish_reason: length.*larger token budget/i);
  });
});
