/**
 * Production answers on one origin: `VERCEL_PROJECT_PRODUCTION_URL` (the value the
 * project is meant to be used through, e.g. `hireflows.vercel.app`). Every other
 * `*.vercel.app` host of the same project is a pinned deployment URL that stays online
 * forever and keeps serving the build it was created from — the classic way an old UI
 * and an old error string survive a redeploy.
 *
 * A browser navigation that reaches a production deployment on any other host is
 * redirected to the production origin. Previews, local development, API routes and
 * static assets are never touched: previews legitimately serve a different build, and
 * an API client, image or chunk fetch must not be bounced to another host.
 */
import { normalizeHost } from "./deployment-info";

export interface NavigationRequestLike {
  method: string;
  headers: { get(name: string): string | null };
  nextUrl: { pathname: string; search?: string; host?: string };
}

type Env = Record<string, string | undefined>;

const STATIC_FILE = /\.[a-z0-9]+$/i;

/**
 * App pages are per-user and built from the current deployment: `/dashboard`, `/sign-in`
 * and `/sign-up`. They must never be stored by a browser or a shared cache, otherwise a
 * browser can keep replaying the HTML/RSC payload of a build that has already been
 * replaced. `next.config.ts` sets the same header; the proxy sets it too because
 * framework and Clerk responses can carry their own `Cache-Control` for these paths.
 */
const APP_PAGE = /^\/(?:dashboard|sign-in|sign-up)(?:\/|$)/;

/** True for the private, per-user pages that must be served with `no-store`. */
export function isAppPagePath(pathname: string): boolean {
  return APP_PAGE.test(pathname);
}

/** Host that answered the request, preferring the proxy's forwarded host. */
export function getRequestHost(req: NavigationRequestLike): string | null {
  return normalizeHost(
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host ?? null,
  );
}

/**
 * Absolute URL to redirect a stale navigation to, or null when the request should be
 * answered normally.
 */
export function getStaleDeploymentRedirect(
  req: NavigationRequestLike,
  env: Env = process.env,
): string | null {
  // Only the production environment has a single canonical origin. Preview deployments
  // have their own URL and local development has no production domain at all.
  if (env.VERCEL_ENV?.trim().toLowerCase() !== "production") return null;

  // Navigations only. A POST, a fetch() with an HTML accept header, or a crawler must
  // never be redirected away from the host it asked for.
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return null;

  const accept = req.headers.get("accept")?.toLowerCase() ?? "";
  if (!accept.includes("text/html")) return null;

  const pathname = req.nextUrl.pathname || "/";
  // API responses and static files are host-agnostic: they stay where they were asked for.
  if (pathname === "/api" || pathname.startsWith("/api/")) return null;
  if (pathname.startsWith("/_next/") || pathname.startsWith("/__clerk")) return null;
  if (STATIC_FILE.test(pathname)) return null;

  const productionHost = normalizeHost(env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!productionHost) return null;

  const host = getRequestHost(req);
  if (!host || host === productionHost) return null;

  return `https://${productionHost}${pathname}${req.nextUrl.search ?? ""}`;
}
