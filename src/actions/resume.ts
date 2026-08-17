'use server';

import { createOrGetUser } from "@/lib/clerk";
import { matchResume } from "@/lib/ai";

import { prisma } from "@/lib/prisma";

export async function analyzeMatch(resumeText: string, jobDescription: string): Promise<{ success: boolean; data?: Awaited<ReturnType<typeof matchResume>>; error?: string }> {
  try {
    // Authenticate user to prevent unauthorized API usage
    const user = await createOrGetUser();
    
    let careerProfileText = "N/A";
    const profile = await prisma.aIUserProfile.findUnique({ where: { userId: user.id } });
    if (profile) {
      careerProfileText = JSON.stringify({
        skills: profile.skills,
        technicalSkills: profile.technicalSkills,
        experience: profile.experience,
        education: profile.education
      });
    }

    const result = await matchResume(resumeText, jobDescription, careerProfileText);
    return { success: true, data: result };
  } catch (e) {
    console.error("Analyze match error:", e);
    return { success: false, error: "Failed to analyze match" };
  }
}
