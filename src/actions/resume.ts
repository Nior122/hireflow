'use server';

import { createOrGetUser } from "@/lib/clerk";
import { matchResume } from "@/lib/ai";

export async function analyzeMatch(resumeText: string, jobDescription: string): Promise<{ success: boolean; data?: Awaited<ReturnType<typeof matchResume>>; error?: string }> {
  try {
    // Authenticate user to prevent unauthorized API usage
    await createOrGetUser();
    const result = await matchResume(resumeText, jobDescription);
    return { success: true, data: result };
  } catch {
    return { success: false, error: "Failed to analyze match" };
  }
}
