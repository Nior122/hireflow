import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { getStaleDeploymentRedirect, isAppPagePath } from "@/lib/stale-deployment";

const APP_PAGE_CACHE_CONTROL = "private, no-store, must-revalidate";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

function withSecurityHeaders(response: Response) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");
  return response;
}

/**
 * A per-user page must not be stored, whoever produced the response. Next serves dynamic
 * renders with its own `Cache-Control` and Clerk can rewrite a protected page, so the
 * header is applied here as well as in `next.config.ts`.
 */
function withAppPageCacheHeaders(response: Response, pathname: string) {
  if (isAppPagePath(pathname)) {
    response.headers.set("Cache-Control", APP_PAGE_CACHE_CONTROL);
  }
  return response;
}

function demoMiddleware(req: NextRequest) {
  const response = NextResponse.next();
  if (isApiRoute(req)) {
    response.headers.set("X-RateLimit-Policy", "100-requests-per-minute");
  }
  return withSecurityHeaders(response);
}

const clerkHandler = clerkMiddleware(async (auth, req) => {
  const response = NextResponse.next();
  withSecurityHeaders(response);

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (isApiRoute(req)) {
    response.headers.set("X-RateLimit-Policy", "100-requests-per-minute");
  }

  return response;
});

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  // A browser navigation that reached this production deployment on a host other than
  // the production origin is a pinned deployment URL: it keeps serving the build it was
  // created from, so send the user to the origin that follows master. API routes, static
  // files, previews and local development are never redirected.
  //
  // This runs before clerkMiddleware on purpose. Clerk answers a development instance's
  // handshake (and `auth.protect()`) *without* calling the configured handler, so a check
  // placed inside the handler would never see those navigations.
  const staleRedirect = getStaleDeploymentRedirect(req);
  const response: Response = staleRedirect
    ? NextResponse.redirect(staleRedirect, 307)
    : process.env.DEMO_MODE === "true"
      ? demoMiddleware(req)
      : ((await clerkHandler(req, event)) ?? NextResponse.next());

  return withAppPageCacheHeaders(withSecurityHeaders(response), req.nextUrl.pathname);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
