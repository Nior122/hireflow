import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");
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

export default process.env.DEMO_MODE === "true" ? demoMiddleware : clerkHandler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
