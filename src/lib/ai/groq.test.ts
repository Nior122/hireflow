import { groqChatJson, groqFetch, getGroqApiKey, demoAiContent } from "./groq";

describe("groq helpers", () => {
  const originalKey = process.env.GROQ_API_KEY;
  const originalDemo = process.env.DEMO_MODE;
  const originalModel = process.env.GROQ_MODEL;

  const otherVars = ['AI_PROVIDER','AI_API_KEY','AI_MODEL','OPENROUTER_API_KEY','OPENAI_API_KEY'] as const;
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

describe('provider transport', () => {
  const keys = ['AI_PROVIDER','AI_API_KEY','AI_MODEL','GROQ_API_KEY','GROQ_MODEL','OPENAI_API_KEY','OPENAI_MODEL','OPENROUTER_API_KEY','OPENROUTER_MODEL'] as const;
  const previous = Object.fromEntries(keys.map(v => [v, process.env[v]]));
  const fetchBefore = global.fetch;
  beforeEach(() => { for (const k of keys) delete process.env[k]; });
  afterEach(() => { global.fetch = fetchBefore; for (const k of keys) { if (previous[k] === undefined) delete process.env[k]; else process.env[k] = previous[k]; } });
  it.each([
    ['groq','GROQ_API_KEY','GROQ_MODEL','https://api.groq.com/openai/v1/chat/completions'],
    ['openrouter','OPENROUTER_API_KEY','OPENROUTER_MODEL','https://openrouter.ai/api/v1/chat/completions'],
    ['openai','OPENAI_API_KEY','OPENAI_MODEL','https://api.openai.com/v1/chat/completions'],
  ])('routes %s calls using configured credentials and model', async (_, keyVar, modelVar, url) => {
    process.env.AI_PROVIDER = _;
    process.env[keyVar] = 'private-test-key'; process.env[modelVar] = 'runtime-model';
    const mock = jest.fn(async () => Response.json({choices:[{message:{content:'Hello'}}]}));
    global.fetch = mock as typeof fetch;
    const result = await groqChatJson({messages:[{role:'user',content:'hello'}],model:'untrusted-request-model'});
    expect(result.ok).toBe(true);
    expect(mock).toHaveBeenCalledWith(url, expect.objectContaining({headers: expect.objectContaining({Authorization:'Bearer private-test-key'}), body: expect.stringContaining('"model":"runtime-model"')}));
  });
});
