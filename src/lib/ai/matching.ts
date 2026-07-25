/**
 * AI Job Matching Engine.
 * Analyzes resumes against job descriptions for match scoring.
 */

import { getProvider, type ChatMessage } from "./providers";
import { z } from "zod";

export const MatchResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendations: z.array(z.string()),
  interviewTips: z.array(z.string()),
  suitability: z.enum(["excellent", "good", "moderate", "poor"]),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

/**
 * Analyze resume against a job description.
 */
export async function analyzeJobMatch(
  resumeText: string,
  jobDescription: string,
  jobTitle?: string,
  company?: string,
): Promise<MatchResult> {
  const provider = getProvider();

  const systemPrompt = `You are an expert career advisor and ATS (Applicant Tracking System) analyst.
Analyze the resume against the job description and provide a detailed match analysis.

Return a JSON object with:
- matchScore: 0-100 (percentage match)
- strengths: Array of 2-4 strengths the candidate has for this role
- missingSkills: Array of 2-4 missing skills or gaps
- recommendations: Array of 2-3 specific recommendations to improve the match
- interviewTips: Array of 2-3 topics to prepare for the interview
- suitability: "excellent" (80+), "good" (60-79), "moderate" (40-59), or "poor" (<40)

Be specific and actionable. Return ONLY the JSON object.`;

  const userMessage = `Job Title: ${jobTitle || "Not specified"}
Company: ${company || "Not specified"}

Resume:
${resumeText.slice(0, 5000)}

Job Description:
${jobDescription.slice(0, 5000)}`;

  try {
    const response = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.3, maxTokens: 1024 },
    );

    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const result = MatchResultSchema.safeParse(parsed);

    if (result.success) return result.data;

    // Return fallback with basic analysis
    return {
      matchScore: 50,
      strengths: ["Resume reviewed"],
      missingSkills: ["Unable to determine"],
      recommendations: ["Review the job requirements manually"],
      interviewTips: ["Prepare for common interview questions"],
      suitability: "moderate",
    };
  } catch {
    return {
      matchScore: 0,
      strengths: [],
      missingSkills: [],
      recommendations: ["Unable to analyze at this time"],
      interviewTips: [],
      suitability: "poor",
    };
  }
}

/**
 * Rank multiple job matches.
 */
export async function rankJobMatches(
  resumeText: string,
  jobs: Array<{ title: string; company: string; description: string }>,
): Promise<Array<{ title: string; company: string; matchScore: number; reason: string }>> {
  const provider = getProvider();

  const systemPrompt = `Rank these jobs by how well they match the resume. For each job, provide:
- matchScore: 0-100
- reason: 1 sentence why

Return a JSON array sorted by matchScore descending. Return ONLY the JSON array.`;

  const jobList = jobs.slice(0, 10).map((j, i) =>
    `${i + 1}. ${j.title} at ${j.company}: ${j.description.slice(0, 500)}`
  ).join("\n\n");

  const userMessage = `Resume:\n${resumeText.slice(0, 3000)}\n\nJobs:\n${jobList}`;

  try {
    const response = await provider.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      { temperature: 0.3, maxTokens: 1500 },
    );

    const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return parsed.map((r: any) => ({
        title: r.title || "",
        company: r.company || "",
        matchScore: r.matchScore ?? 50,
        reason: r.reason || "",
      }));
    }
  } catch {}

  // Fallback: return jobs with default scores
  return jobs.map(j => ({
    title: j.title,
    company: j.company,
    matchScore: 50,
    reason: "Unable to analyze",
  }));
}
