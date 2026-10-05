jest.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: jest.fn(async () => [{ ok: 1 }]) },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const AI_VARS = [
  "AI_PROVIDER", "AI_API_KEY", "AI_MODEL", "AI_BASE_URL",
  "GROQ_API_KEY", "GROQ_MODEL",
  "OPENROUTER_API_KEY", "OPENROUTER_MODEL",
  "OPENAI_API_KEY", "OPENAI_MODEL",
] as const;

const VERCEL_VARS = ["VERCEL_ENV", "VERCEL_GIT_COMMIT_SHA", "VERCEL_GIT_COMMIT_REF", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const v of [...AI_VARS, ...VERCEL_VARS]) delete process.env[v];
  (prisma.$queryRaw as jest.Mock).mockClear();
});

afterAll(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

beforeAll(() => {
  for (const v of [...AI_VARS, ...VERCEL_VARS]) saved[v] = process.env[v];
});

async function readHealth() {
  const response = await GET();
  return { response, body: await response.json() };
}

describe("GET /api/health AI check", () => {
  it("reports AI as not configured when a key is present but the model is missing", async () => {
    process.env.GROQ_API_KEY = "gsk_secret-key-value";
    const { body } = await readHealth();
    expect(body.checks.ai.status).toBe("not_configured");
    expect(body.checks.ai.provider).toBe("groq");
    expect(body.checks.ai.model).toBeNull();
    expect(body.checks.ai.error).toMatch(/GROQ_MODEL/);
    // Deprecated alias stays in step with the provider-aware field.
    expect(body.checks.groq.status).toBe("not_configured");
  });

  it.each([
    ["groq", "GROQ_API_KEY", "GROQ_MODEL", "llama-3.3-70b-versatile"],
    ["openrouter", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "vendor/model"],
    ["openai", "OPENAI_API_KEY", "OPENAI_MODEL", "gpt-4o-mini"],
  ])("reports %s as configured with the model from the environment", async (provider, keyVar, modelVar, model) => {
    process.env.AI_PROVIDER = provider as string;
    process.env[keyVar] = "provider-secret";
    process.env[modelVar] = model;
    const { body } = await readHealth();
    expect(body.checks.ai).toMatchObject({ status: "configured", provider, model, error: null });
  });

  it("reports a custom OpenAI-compatible provider as configured", async () => {
    process.env.AI_PROVIDER = "custom";
    process.env.AI_API_KEY = "provider-secret";
    process.env.AI_MODEL = "self-hosted/model";
    process.env.AI_BASE_URL = "https://ai.example.com/v1";
    const { body } = await readHealth();
    expect(body.checks.ai).toMatchObject({ status: "configured", provider: "custom", model: "self-hosted/model" });
  });

  it("never returns the API key, the endpoint, or any credential", async () => {
    process.env.AI_PROVIDER = "custom";
    process.env.AI_API_KEY = "super-secret-value";
    process.env.AI_MODEL = "self-hosted/model";
    process.env.AI_BASE_URL = "https://ai.example.com/v1";
    const { body } = await readHealth();
    const serialised = JSON.stringify(body);
    expect(serialised).not.toContain("super-secret-value");
    expect(serialised).not.toContain("ai.example.com");
  });
});

describe("GET /api/health deployment identity", () => {
  it("reports the Vercel environment, commit and production url serving the request", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_GIT_COMMIT_SHA = "f84f45df937814428c5a5bff775b7a067b4189a4";
    process.env.VERCEL_GIT_COMMIT_REF = "master";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "hireflows.vercel.app";
    const { body } = await readHealth();
    expect(body.deployment).toEqual({
      environment: "production",
      commit: "f84f45df937814428c5a5bff775b7a067b4189a4",
      branch: "master",
      url: "https://hireflows.vercel.app",
    });
  });

  it("falls back to local values when Vercel metadata is absent", async () => {
    const { body } = await readHealth();
    expect(body.deployment).toEqual({ environment: "local", commit: null, branch: null, url: null });
  });
});
