"use server";

import { GroqProvider } from "@/lib/ai/providers";
import { z } from "zod";
import type { ActionResponse } from "@/lib/types";

const JobRelevanceSchema = z.object({
  overallScore: z.number().min(0).max(100),
  skillMatch: z.number().min(0).max(100),
  experienceMatch: z.number().min(0).max(100),
  locationMatch: z.number().min(0).max(100),
  salaryMatch: z.number().min(0).max(100),
  preferenceMatch: z.number().min(0).max(100),
  missingSkills: z.array(z.string()),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  recommendation: z.string()
});

export type JobRelevanceResult = z.infer<typeof JobRelevanceSchema>;

export async function calculateJobMatch(userProfileText: string, jobDescriptionText: string): Promise<ActionResponse<JobRelevanceResult>> {
  try {
    const provider = new GroqProvider();
    
    const systemPrompt = `You are a career intelligence system. Your job is to calculate how well a job description matches a user's career profile.
    Evaluate the following areas out of 100: skillMatch, experienceMatch, locationMatch, salaryMatch, preferenceMatch.
    Also compute an overallScore (out of 100) based on those sub-scores.
    Identify missingSkills, strengths (why they are a good fit), concerns (potential red flags like missing years of experience), and provide a short recommendation.
    Return ONLY valid JSON matching this schema: 
    {
      "overallScore": number,
      "skillMatch": number,
      "experienceMatch": number,
      "locationMatch": number,
      "salaryMatch": number,
      "preferenceMatch": number,
      "missingSkills": string[],
      "strengths": string[],
      "concerns": string[],
      "recommendation": string
    }`;

    const userPrompt = `USER PROFILE:\n${userProfileText}\n\nJOB DESCRIPTION:\n${jobDescriptionText}`;

    const raw = await provider.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ], { temperature: 0.2, maxTokens: 1024 });

    let extracted: JobRelevanceResult;
    try {
      const parsed = JSON.parse(raw.trim());
      extracted = JobRelevanceSchema.parse(parsed);
    } catch {
      return { success: false, error: "Failed to parse job relevance response from AI" };
    }

    return { success: true, data: extracted };
  } catch (error) {
    console.error("[job-relevance] Error:", error);
    return { success: false, error: "Failed to calculate job relevance" };
  }
}
