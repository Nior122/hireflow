'use server';

import { prisma, Prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";

interface CareerProfileData {
  id: string;
  userId: string;
  fullName: string | null;
  headline: string | null;
  summary: string | null;
  skills: string[];
  experience: unknown;
  education: unknown;
  preferences: unknown;
  createdAt: Date;
  updatedAt: Date;
}

interface CareerProfileInput {
  fullName?: string;
  headline?: string;
  summary?: string;
  skills?: string[];
  experience?: unknown;
  education?: unknown;
  preferences?: unknown;
}

export async function getCareerProfile(): Promise<ActionResponse<CareerProfileData | null>> {
  try {
    const user = await createOrGetUser();
    const profile = await prisma.careerProfile.findUnique({
      where: { userId: user.id },
    });
    return { success: true, data: profile as CareerProfileData | null };
  } catch {
    return { success: false, error: "Failed to load career profile." };
  }
}

export async function upsertCareerProfile(
  data: CareerProfileInput
): Promise<ActionResponse<CareerProfileData>> {
  try {
    const user = await createOrGetUser();

    // Sanitize — never allow empty string skills
    const skills = (data.skills ?? [])
      .map(s => s.trim())
      .filter(Boolean);

    const profile = await prisma.careerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: data.fullName?.trim() ?? null,
        headline: data.headline?.trim() ?? null,
        summary: data.summary?.trim() ?? null,
        skills,
        experience: data.experience !== undefined ? data.experience as Prisma.InputJsonValue : undefined,
        education: data.education !== undefined ? data.education as Prisma.InputJsonValue : undefined,
        preferences: data.preferences !== undefined ? data.preferences as Prisma.InputJsonValue : undefined,
      },
      update: {
        ...(data.fullName !== undefined && { fullName: data.fullName.trim() }),
        ...(data.headline !== undefined && { headline: data.headline.trim() }),
        ...(data.summary !== undefined && { summary: data.summary.trim() }),
        ...(data.skills !== undefined && { skills }),
        ...(data.experience !== undefined && { experience: data.experience as Prisma.InputJsonValue }),
        ...(data.education !== undefined && { education: data.education as Prisma.InputJsonValue }),
        ...(data.preferences !== undefined && { preferences: data.preferences as Prisma.InputJsonValue }),
      },
    });

    revalidatePath("/dashboard");
    return { success: true, data: profile as CareerProfileData };
  } catch {
    return { success: false, error: "Failed to save career profile." };
  }
}

export async function updateSkills(skills: string[]): Promise<ActionResponse<CareerProfileData>> {
  const cleaned = skills.map(s => s.trim()).filter(Boolean);
  return upsertCareerProfile({ skills: cleaned });
}
