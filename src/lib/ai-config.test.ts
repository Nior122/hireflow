import { getGroqModel } from "./ai-config";

describe("getGroqModel", () => {
  const original = process.env.GROQ_MODEL;

  afterEach(() => {
    if (original === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = original;
  });

  it("reads the model from GROQ_MODEL", () => {
    process.env.GROQ_MODEL = "my-env-model";
    expect(getGroqModel()).toBe("my-env-model");
  });

  it("prefers an explicit override", () => {
    process.env.GROQ_MODEL = "env-model";
    expect(getGroqModel("override-model")).toBe("override-model");
  });

  it("throws when the env var is missing", () => {
    delete process.env.GROQ_MODEL;
    expect(() => getGroqModel()).toThrow(/GROQ_MODEL is not set/);
  });
});
