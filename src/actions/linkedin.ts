'use server';

import { createOrGetUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";

export async function fetchLinkedInMetadata(url: string): Promise<{ success: boolean; data?: { company: string; role: string; location?: string; description?: string }; error?: string }> {
  try {
    // Authenticate user to prevent unauthorized external requests
    const user = await createOrGetUser();

    // Validate URL for safety (prevent SSRF)
    const parsedUrl = new URL(url);
    const allowedHosts = ["linkedin.com", "www.linkedin.com", "linkedin.com.au", "linkedin.co.uk", "linkedin.de", "linkedin.fr", "linkedin.ca", "linkedin.in"];
    if (!allowedHosts.some(h => parsedUrl.hostname === h || parsedUrl.hostname.endsWith("." + h))) {
      return { success: false, error: "Only LinkedIn URLs are supported" };
    }

    // Check for duplicate
    const existing = await prisma.jobApplication.findFirst({
      where: { userId: user.id, link: { equals: url } }
    });
    if (existing) {
      return { success: false, error: "You have already saved this job application" };
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
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) || html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);

    const title = ogTitleMatch?.[1] ?? twitterTitleMatch?.[1] ?? titleMatch?.[1] ?? "";
    const description = descMatch?.[1] ?? "";
    const parts = title.split("|").map((s: string) => s.trim());
    
    // Attempt JSON-LD extraction for richer data
    let location = "";
    let companyName = parts[0] || "";
    let roleTitle = parts.length >= 2 ? parts[1] : parts[0] || "";
    
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*({[\s\S]*?})\s*<\/script>/i);
    if (jsonLdMatch && jsonLdMatch[1]) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        if (ld["@type"] === "JobPosting") {
          roleTitle = ld.title || roleTitle;
          companyName = ld.hiringOrganization?.name || companyName;
          if (ld.jobLocation?.address?.addressLocality) {
            location = ld.jobLocation.address.addressLocality;
            if (ld.jobLocation.address.addressRegion) location += `, ${ld.jobLocation.address.addressRegion}`;
          }
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    if (!companyName && !roleTitle) {
      return { success: false, error: "Could not extract job details from URL" };
    }

    return { success: true, data: { company: companyName, role: roleTitle, location, description } };
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      return { success: false, error: "Request timed out" };
    }
    return { success: false, error: "Failed to fetch LinkedIn metadata" };
  }
}
