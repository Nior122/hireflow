'use server';

import { createOrGetUser } from "@/lib/clerk";

export async function fetchLinkedInMetadata(url: string): Promise<{ success: boolean; data?: { company: string; role: string }; error?: string }> {
  try {
    // Authenticate user to prevent unauthorized external requests
    await createOrGetUser();

    // Validate URL for safety (prevent SSRF)
    const parsedUrl = new URL(url);
    const allowedHosts = ["linkedin.com", "www.linkedin.com", "linkedin.com.au", "linkedin.co.uk", "linkedin.de", "linkedin.fr", "linkedin.ca", "linkedin.in"];
    if (!allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith("." + h))) {
      return { success: false, error: "Only LinkedIn URLs are supported" };
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HireFlow/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch URL: ${response.status}` };
    }

    const html = await response.text();

    // Try Open Graph title
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    // Try Twitter title
    const twitterTitleMatch = html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i);
    // Try regular title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

    const title = ogTitleMatch?.[1] ?? twitterTitleMatch?.[1] ?? titleMatch?.[1] ?? "";
    const parts = title.split("|").map((s: string) => s.trim());
    const company = parts[0] || "";
    const role = parts.length >= 2 ? parts[1] : parts[0] || "";

    if (!company && !role) {
      return { success: false, error: "Could not extract job details from URL" };
    }

    return { success: true, data: { company, role } };
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { success: false, error: "Request timed out" };
    }
    return { success: false, error: "Failed to fetch LinkedIn metadata" };
  }
}
