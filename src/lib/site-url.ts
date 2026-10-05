/**
 * Public origin for this deployment.
 *
 * Used for canonical URLs, Open Graph tags and the sitemap. It never falls back to a
 * hard-coded marketing domain: pointing canonicals at a domain the deployment does
 * not control sends search engines, social previews and OAuth-style redirects to the
 * wrong host.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) return `https://${productionHost}`;

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) return `https://${deploymentHost}`;

  return "http://localhost:3000";
}
