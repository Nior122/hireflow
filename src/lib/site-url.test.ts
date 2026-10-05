import { getSiteUrl } from "./site-url";

const VARS = ["NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;
const previous = Object.fromEntries(VARS.map(v => [v, process.env[v]]));

beforeEach(() => { for (const v of VARS) delete process.env[v]; });
afterAll(() => { for (const v of VARS) { if (previous[v] === undefined) delete process.env[v]; else process.env[v] = previous[v]; } });

test("prefers the explicitly configured public app url", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://hireflows.vercel.app/";
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "ignored.vercel.app";
  expect(getSiteUrl()).toBe("https://hireflows.vercel.app");
});

test("falls back to the Vercel production domain of this project", () => {
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "hireflows.vercel.app";
  process.env.VERCEL_URL = "hireflow-abc123-scope.vercel.app";
  expect(getSiteUrl()).toBe("https://hireflows.vercel.app");
});

test("falls back to the current deployment url on previews", () => {
  process.env.VERCEL_URL = "hireflow-abc123-scope.vercel.app";
  expect(getSiteUrl()).toBe("https://hireflow-abc123-scope.vercel.app");
});

test("never points canonical urls at a domain the deployment does not control", () => {
  expect(getSiteUrl()).toBe("http://localhost:3000");
});
