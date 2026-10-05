/**
 * Origin of the deployed HireFlow web app.
 *
 * Override at build time with VITE_HIREFLOW_APP_URL so the extension points at the
 * deployment you actually serve (production, preview, or a self-hosted origin).
 * The default is the production origin, NOT a hard-coded deployment URL: pinned
 * `*.vercel.app` deployment URLs keep serving an old build after you redeploy.
 */
const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

export const APP_URL = (env?.VITE_HIREFLOW_APP_URL?.trim() || "https://hireflows.vercel.app").replace(/\/+$/, "");
