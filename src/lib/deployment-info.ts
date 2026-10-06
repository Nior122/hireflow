/**
 * Description of the build a browser is actually talking to.
 *
 * Vercel injects `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA` into every deployment. They
 * are the only way to tell the production domain (which follows `master`) apart from a
 * pinned deployment URL (`<project>-<hash>-<scope>.vercel.app`), which stays online
 * forever and keeps serving the build it was created from.
 */

export type DeploymentEnvironment = "production" | "preview" | "development";

export interface DeploymentInfo {
  environment: DeploymentEnvironment;
  /** Full commit SHA the deployment was built from, when the platform reports one. */
  commit: string | null;
  /** First seven characters of `commit`, for the badge. */
  shortCommit: string | null;
  /** Hostname answering this request, lowercased and without the default port. */
  host: string | null;
  /** Hostname of the production domain of this project, when configured. */
  productionHost: string | null;
  /** Absolute production origin, when configured. */
  productionUrl: string | null;
  /** True when a production build is served from a host that is not the production origin. */
  pinned: boolean;
  /** `environment · <short sha> · <host>`, the string shown on every dashboard page. */
  label: string;
}

type Env = Record<string, string | undefined>;

/** Reduce a host header, URL or bare hostname to a lowercase `host[:port]` without the default port. */
export function normalizeHost(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const authority = withoutScheme.split("/")[0].split("@").pop() ?? "";
  const host = authority.toLowerCase().replace(/:(?:80|443)$/, "");
  return host || null;
}

function readEnvironment(env: Env): DeploymentEnvironment {
  const vercel = env.VERCEL_ENV?.trim().toLowerCase();
  if (vercel === "production" || vercel === "preview" || vercel === "development") return vercel;
  return env.NODE_ENV === "production" ? "production" : "development";
}

/**
 * Pure helper so tests can describe a request without booting Next.js. `host` is the
 * request host (host header or `VERCEL_URL` when a header is not available).
 */
export function describeDeployment({ env, host }: { env: Env; host?: string | null }): DeploymentInfo {
  const environment = readEnvironment(env);
  const commit = env.VERCEL_GIT_COMMIT_SHA?.trim() || null;
  const shortCommit = commit ? commit.slice(0, 7) : null;
  const requestHost = normalizeHost(host ?? env.VERCEL_URL);
  const productionHost = normalizeHost(env.VERCEL_PROJECT_PRODUCTION_URL ?? env.NEXT_PUBLIC_APP_URL);
  const productionUrl = productionHost ? `https://${productionHost}` : null;
  const pinned =
    environment === "production" &&
    Boolean(productionHost) &&
    Boolean(requestHost) &&
    requestHost !== productionHost;

  return {
    environment,
    commit,
    shortCommit,
    host: requestHost,
    productionHost,
    productionUrl,
    pinned,
    label: [environment, shortCommit ?? "local", requestHost ?? "unknown-host"].join(" · "),
  };
}
