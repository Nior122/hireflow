import { getStaleDeploymentRedirect, isAppPagePath, type NavigationRequestLike } from "./stale-deployment";

const PINNED_HOST = "hireflow-bjlgc6pk7-neches-projects-eea926c7.vercel.app";
const PRODUCTION_HOST = "hireflows.vercel.app";

const PRODUCTION_ENV = {
  VERCEL_ENV: "production",
  VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST,
};

interface RequestOptions {
  method?: string;
  pathname?: string;
  search?: string;
  /** Overrides for the incoming headers; `null` means the header is absent. */
  headers?: Record<string, string | null>;
}

function request({ method = "GET", pathname = "/dashboard", search = "", headers = {} }: RequestOptions = {}): NavigationRequestLike {
  const headerMap: Record<string, string | null> = {
    "x-forwarded-host": PINNED_HOST,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ...headers,
  };
  return {
    method,
    headers: { get: (name: string) => headerMap[name.toLowerCase()] ?? null },
    nextUrl: { pathname, search, host: PINNED_HOST },
  };
}

describe("getStaleDeploymentRedirect", () => {
  it("sends a production navigation from a pinned deployment URL to the production origin", () => {
    expect(getStaleDeploymentRedirect(request(), PRODUCTION_ENV)).toBe(
      `https://${PRODUCTION_HOST}/dashboard`,
    );
  });

  it("keeps the query string", () => {
    expect(getStaleDeploymentRedirect(request({ search: "?tab=ai" }), PRODUCTION_ENV)).toBe(
      `https://${PRODUCTION_HOST}/dashboard?tab=ai`,
    );
  });

  it("leaves the production origin alone", () => {
    const req = request({ headers: { "x-forwarded-host": PRODUCTION_HOST } });
    req.nextUrl.host = PRODUCTION_HOST;
    expect(getStaleDeploymentRedirect(req, PRODUCTION_ENV)).toBeNull();
  });

  it("never redirects previews or local development", () => {
    const previewEnv = { VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST };
    expect(getStaleDeploymentRedirect(request(), previewEnv)).toBeNull();
    expect(getStaleDeploymentRedirect(request(), { VERCEL_PROJECT_PRODUCTION_URL: PRODUCTION_HOST })).toBeNull();
    expect(getStaleDeploymentRedirect(request(), {})).toBeNull();
  });

  it("never redirects non-navigations", () => {
    // A curl / fetch / health probe does not ask for HTML and must get the host it asked for.
    expect(getStaleDeploymentRedirect(request({ headers: { accept: "*/*" } }), PRODUCTION_ENV)).toBeNull();
    expect(getStaleDeploymentRedirect(request({ headers: { accept: null } }), PRODUCTION_ENV)).toBeNull();
    expect(getStaleDeploymentRedirect(request({ method: "POST" }), PRODUCTION_ENV)).toBeNull();
    expect(getStaleDeploymentRedirect(request({ method: "OPTIONS" }), PRODUCTION_ENV)).toBeNull();
  });

  it("never redirects API routes or static files", () => {
    for (const pathname of [
      "/api/health",
      "/api/debug/dump",
      "/_next/static/chunks/main.js",
      "/favicon.ico",
      "/sitemap.xml",
      "/reminder-sw.js",
      "/logo.png",
    ]) {
      expect(getStaleDeploymentRedirect(request({ pathname }), PRODUCTION_ENV)).toBeNull();
    }
  });

  it("does nothing when the production origin is unknown or the host cannot be read", () => {
    expect(getStaleDeploymentRedirect(request(), { VERCEL_ENV: "production" })).toBeNull();
    const req = request({ headers: { "x-forwarded-host": null, host: null } });
    req.nextUrl.host = "";
    expect(getStaleDeploymentRedirect(req, PRODUCTION_ENV)).toBeNull();
  });

  it("prefers the forwarded host over the internal host", () => {
    const req = request({ headers: { "x-forwarded-host": PINNED_HOST, host: "internal" } });
    expect(getStaleDeploymentRedirect(req, PRODUCTION_ENV)).toBe(`https://${PRODUCTION_HOST}/dashboard`);
  });
});

describe("isAppPagePath", () => {
  it("matches the per-user pages, including their sub-paths", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboard/settings",
      "/dashboard/jobs/123",
      "/sign-in",
      "/sign-in/factor-one",
      "/sign-up",
      "/sign-up/verify-email-address",
    ]) {
      expect(isAppPagePath(pathname)).toBe(true);
    }
  });

  it("leaves public pages, API routes and lookalike paths alone", () => {
    for (const pathname of ["/", "/pricing", "/api/dashboard", "/dashboard-preview", "/sign-in-page"]) {
      expect(isAppPagePath(pathname)).toBe(false);
    }
  });
});
