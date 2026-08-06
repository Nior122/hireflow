'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";

export interface SearchResult {
  id: string;
  type: "application" | "interview" | "candidate";
  title: string;
  subtitle: string;
  url: string;
}

export async function globalSearch(query: string): Promise<ActionResponse<SearchResult[]>> {
  try {
    const user = await createOrGetUser();
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    const q = query.trim();
    const results: SearchResult[] = [];

    // Search Job Applications
    const apps = await prisma.jobApplication.findMany({
      where: {
        userId: user.id,
        OR: [
          { company: { contains: q, mode: 'insensitive' } },
          { role: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 5
    });

    for (const app of apps) {
      results.push({
        id: `app_${app.id}`,
        type: "application",
        title: `${app.role} at ${app.company}`,
        subtitle: `Status: ${app.status}`,
        url: `/dashboard/applications/${app.id}` // Placeholder or we just open detail drawer
      });
    }

    // Search Candidates (if employer)
    if (user.role === "EMPLOYER") {
      const candidates = await prisma.candidate.findMany({
        where: {
          employerId: user.id,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { positionApplied: { contains: q, mode: 'insensitive' } },
          ]
        },
        take: 5
      });

      for (const cand of candidates) {
        results.push({
          id: `cand_${cand.id}`,
          type: "candidate",
          title: cand.name,
          subtitle: `Applied for: ${cand.positionApplied} • ${cand.email}`,
          url: `/dashboard/candidates/${cand.id}`
        });
      }
    } else {
      // Search Interviews (if job seeker)
      const interviews = await prisma.interview.findMany({
        where: {
          userId: user.id,
          OR: [
            { company: { contains: q, mode: 'insensitive' } },
            { position: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ]
        },
        take: 5
      });

      for (const inv of interviews) {
        results.push({
          id: `inv_${inv.id}`,
          type: "interview",
          title: `${inv.interviewType} Round ${inv.interviewRound} at ${inv.company}`,
          subtitle: `Scheduled for: ${inv.scheduledAt ? inv.scheduledAt.toLocaleDateString() : 'TBD'}`,
          url: `/dashboard/interviews`
        });
      }
    }

    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: "Search failed" };
  }
}
