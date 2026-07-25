'use server';

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";

export async function getTemplates(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const user = await createOrGetUser();
    const templates = await prisma.emailTemplate.findMany({ where: { employerId: user.id }, orderBy: { createdAt: "desc" } });
    return { success: true, data: templates };
  } catch { return { success: false, error: "Failed to fetch templates" }; }
}

export async function createTemplate(data: { name: string; subject: string; body: string; isDefault?: boolean; autoSend?: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await createOrGetUser();
    if (data.isDefault) {
      await prisma.emailTemplate.updateMany({ where: { employerId: user.id }, data: { isDefault: false } });
    }
    await prisma.emailTemplate.create({
      data: { ...data, employerId: user.id, isDefault: data.isDefault ?? false, autoSend: data.autoSend ?? false },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { success: false, error: "Failed to create template" }; }
}

export async function deleteTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.emailTemplate.findFirst({ where: { id, employerId: user.id } });
    if (!existing) return { success: false, error: "Template not found" };
    await prisma.emailTemplate.delete({ where: { id } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { success: false, error: "Failed to delete template" }; }
}
