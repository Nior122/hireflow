import { describeDeployment, normalizeHost } from "./deployment-info";

const SHA = "9454d81c2f1e4b6a8d0f3e5c7a9b1d2e3f4a5b6c";

describe("normalizeHost", () => {
  it("accepts bare hostnames, host headers, origins and full URLs", () => {
    expect(normalizeHost("hireflows.vercel.app")).toBe("hireflows.vercel.app");
    expect(normalizeHost("HireFlows.Vercel.App:443")).toBe("hireflows.vercel.app");
    expect(normalizeHost("https://hireflows.vercel.app/")).toBe("hireflows.vercel.app");
    expect(normalizeHost("http://localhost:3000/dashboard")).toBe("localhost:3000");
    expect(normalizeHost("  hireflow-abc123-scope.vercel.app  ")).toBe("hireflow-abc123-scope.vercel.app");
  });

  it("returns null for empty input", () => {
    expect(normalizeHost(undefined)).toBeNull();
    expect(normalizeHost("")).toBeNull();
    expect(normalizeHost("   ")).toBeNull();
  });
});

describe("describeDeployment", () => {
  const productionEnv = {
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: SHA,
    VERCEL_PROJECT_PRODUCTION_URL: "hireflows.vercel.app",
  };

  it("labels a production request with environment, short sha and host", () => {
    const info = describeDeployment({ env: productionEnv, host: "hireflows.vercel.app" });
    expect(info.label).toBe("production · 9454d81 · hireflows.vercel.app");
    expect(info).toMatchObject({
      environment: "production",
      commit: SHA,
      shortCommit: "9454d81",
      host: "hireflows.vercel.app",
      productionHost: "hireflows.vercel.app",
      productionUrl: "https://hireflows.vercel.app",
      pinned: false,
    });
  });

  it("flags a production build on a pinned deployment URL", () => {
    const info = describeDeployment({
      env: productionEnv,
      host: "hireflow-bjlgc6pk7-neches-projects-eea926c7.vercel.app",
    });
    expect(info.pinned).toBe(true);
    expect(info.productionUrl).toBe("https://hireflows.vercel.app");
    expect(info.label).toBe(
      "production · 9454d81 · hireflow-bjlgc6pk7-neches-projects-eea926c7.vercel.app",
    );
  });

  it("never flags a preview or a local build, even when the host differs", () => {
    for (const env of [
      { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: SHA, VERCEL_PROJECT_PRODUCTION_URL: "hireflows.vercel.app" },
      { VERCEL_ENV: "development", VERCEL_PROJECT_PRODUCTION_URL: "hireflows.vercel.app" },
      {},
    ]) {
      const info = describeDeployment({ env, host: "hireflow-abc123-scope.vercel.app" });
      expect(info.pinned).toBe(false);
    }
  });

  it("uses NEXT_PUBLIC_APP_URL when the platform does not expose a production domain", () => {
    const info = describeDeployment({
      env: { VERCEL_ENV: "production", NEXT_PUBLIC_APP_URL: "https://hireflows.vercel.app" },
      host: "hireflow-iblz67d18-neches-projects-eea926c7.vercel.app",
    });
    expect(info.productionUrl).toBe("https://hireflows.vercel.app");
    expect(info.pinned).toBe(true);
  });

  it("falls back to the deployment host and a local marker when the platform reports nothing", () => {
    const info = describeDeployment({ env: { VERCEL_URL: "hireflow-abc123-scope.vercel.app" } });
    expect(info.environment).toBe("development");
    expect(info.host).toBe("hireflow-abc123-scope.vercel.app");
    expect(info.shortCommit).toBeNull();
    expect(info.label).toBe("development · local · hireflow-abc123-scope.vercel.app");
    expect(info.pinned).toBe(false);
  });

  it("does not invent a production origin when none is configured", () => {
    const info = describeDeployment({ env: { VERCEL_ENV: "production" }, host: "some-other-host.example.com" });
    expect(info.productionHost).toBeNull();
    expect(info.productionUrl).toBeNull();
    expect(info.pinned).toBe(false);
  });
});
