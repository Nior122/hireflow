'use server';

import { prisma, Prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";

export interface AIUserProfileData {
  id: string;
  userId: string;
  summary: string | null;
  careerGoals: unknown;
  preferredRoles: string[];
  preferredLocations: string[];
  preferredWorkModes: string[];
  skills: string[];
  technicalSkills: string[];
  softSkills: string[];
  education: unknown;
  certifications: unknown;
  experience: unknown;
  projects: unknown;
  achievements: string[];
  languages: string[];
  salaryExpectation: string | null;
  industries: string[];
  preferredCompanies: string[];
  yearsOfExperience: number | null;
  strengths: string[];
  weaknesses: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type AIUserProfileInput = Partial<Omit<AIUserProfileData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;

export async function getCareerProfile(): Promise<ActionResponse<AIUserProfileData | null>> {
  try {
    const user = await createOrGetUser();
    const profile = await prisma.aIUserProfile.findUnique({
      where: { userId: user.id },
    });
    return { success: true, data: profile as AIUserProfileData | null };
  } catch {
    return { success: false, error: "Failed to load career profile." };
  }
}

export async function upsertCareerProfile(
  data: AIUserProfileInput
): Promise<ActionResponse<AIUserProfileData>> {
  try {
    const user = await createOrGetUser();

    // Clean arrays
    const cleanArray = (arr?: string[]) => (arr ?? []).map(s => s.trim()).filter(Boolean);

    const skills = cleanArray(data.skills);
    const preferredRoles = cleanArray(data.preferredRoles);
    const preferredLocations = cleanArray(data.preferredLocations);
    const preferredWorkModes = cleanArray(data.preferredWorkModes);
    const technicalSkills = cleanArray(data.technicalSkills);
    const softSkills = cleanArray(data.softSkills);
    const achievements = cleanArray(data.achievements);
    const languages = cleanArray(data.languages);
    const industries = cleanArray(data.industries);
    const preferredCompanies = cleanArray(data.preferredCompanies);
    const strengths = cleanArray(data.strengths);
    const weaknesses = cleanArray(data.weaknesses);

    const profile = await prisma.aIUserProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        summary: data.summary?.trim() ?? null,
        salaryExpectation: data.salaryExpectation?.trim() ?? null,
        yearsOfExperience: data.yearsOfExperience ?? null,
        skills,
        preferredRoles,
        preferredLocations,
        preferredWorkModes,
        technicalSkills,
        softSkills,
        achievements,
        languages,
        industries,
        preferredCompanies,
        strengths,
        weaknesses,
        careerGoals: data.careerGoals !== undefined ? data.careerGoals as Prisma.InputJsonValue : Prisma.JsonNull,
        experience: data.experience !== undefined ? data.experience as Prisma.InputJsonValue : Prisma.JsonNull,
        education: data.education !== undefined ? data.education as Prisma.InputJsonValue : Prisma.JsonNull,
        certifications: data.certifications !== undefined ? data.certifications as Prisma.InputJsonValue : Prisma.JsonNull,
        projects: data.projects !== undefined ? data.projects as Prisma.InputJsonValue : Prisma.JsonNull,
      },
      update: {
        ...(data.summary !== undefined && { summary: data.summary?.trim() ?? null }),
        ...(data.salaryExpectation !== undefined && { salaryExpectation: data.salaryExpectation?.trim() ?? null }),
        ...(data.yearsOfExperience !== undefined && { yearsOfExperience: data.yearsOfExperience }),
        ...(data.skills !== undefined && { skills }),
        ...(data.preferredRoles !== undefined && { preferredRoles }),
        ...(data.preferredLocations !== undefined && { preferredLocations }),
        ...(data.preferredWorkModes !== undefined && { preferredWorkModes }),
        ...(data.technicalSkills !== undefined && { technicalSkills }),
        ...(data.softSkills !== undefined && { softSkills }),
        ...(data.achievements !== undefined && { achievements }),
        ...(data.languages !== undefined && { languages }),
        ...(data.industries !== undefined && { industries }),
        ...(data.preferredCompanies !== undefined && { preferredCompanies }),
        ...(data.strengths !== undefined && { strengths }),
        ...(data.weaknesses !== undefined && { weaknesses }),
        ...(data.careerGoals !== undefined && { careerGoals: data.careerGoals as Prisma.InputJsonValue }),
        ...(data.experience !== undefined && { experience: data.experience as Prisma.InputJsonValue }),
        ...(data.education !== undefined && { education: data.education as Prisma.InputJsonValue }),
        ...(data.certifications !== undefined && { certifications: data.certifications as Prisma.InputJsonValue }),
        ...(data.projects !== undefined && { projects: data.projects as Prisma.InputJsonValue }),
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: profile as AIUserProfileData };
  } catch {
    return { success: false, error: "Failed to save career profile." };
  }
}

export async function updateSkills(skills: string[]): Promise<ActionResponse<AIUserProfileData>> {
  const cleaned = skills.map(s => s.trim()).filter(Boolean);
  return upsertCareerProfile({ skills: cleaned });
}
