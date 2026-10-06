"use client";

import { useEffect, useState } from "react";
import { describeDeployment, type DeploymentInfo } from "@/lib/deployment-info";

/**
 * The build a dashboard page is being served from, without signing in or opening Vercel.
 *
 * `NEXT_PUBLIC_VERCEL_*` copies of the platform's system variables are inlined into the
 * browser bundle at build time, so they describe the build this bundle came from.
 */
function platformEnv() {
  return {
    VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    VERCEL_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  };
}

/** Deployment of the page in front of the user, or null until the browser is available. */
export function useDeploymentInfo(): DeploymentInfo | null {
  const [info, setInfo] = useState<DeploymentInfo | null>(null);

  useEffect(() => {
    const host = window.location.host;
    const local = describeDeployment({ env: platformEnv(), host });
    setInfo(local);

    // Server and client must agree on the first paint, so the badge only renders after
    // this effect. If the platform did not expose its system variables to the browser,
    // /api/health still reports them for the build that answered the request.
    if (local.commit && local.environment !== "development") return;
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        const deployment = body?.deployment;
        if (cancelled || !deployment?.commit) return;
        setInfo(
          describeDeployment({
            env: {
              VERCEL_ENV: deployment.environment,
              VERCEL_GIT_COMMIT_SHA: deployment.commit,
              VERCEL_PROJECT_PRODUCTION_URL: deployment.url,
            },
            host,
          }),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

/**
 * `environment · <short sha> · <host>` at the bottom of every dashboard page. The host
 * is the one the browser is actually on, which is what distinguishes the production
 * domain from a pinned deployment URL.
 */
export function DeploymentBadge() {
  const info = useDeploymentInfo();
  if (!info) return null;

  return (
    <p
      data-testid="deployment-badge"
      title={info.commit ? `commit ${info.commit}` : undefined}
      className="mt-10 mb-2 text-center font-mono text-xs text-muted-foreground"
    >
      {info.label}
    </p>
  );
}

/**
 * Amber warning shown when the dashboard is being served by a pinned deployment URL of
 * the production environment - a build that never updates, however often `master` is
 * redeployed.
 */
export function PinnedDeploymentBanner() {
  const info = useDeploymentInfo();
  if (!info?.pinned || !info.productionUrl) return null;

  return (
    <div
      role="status"
      data-testid="pinned-deployment-banner"
      className="mx-4 mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-6 lg:mx-8 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      You are viewing a pinned deployment URL, which keeps serving the build it was created
      from.{" "}
      <a href={info.productionUrl} className="font-medium underline underline-offset-2">
        Open {info.productionHost}
      </a>{" "}
      for the current one.
    </div>
  );
}
