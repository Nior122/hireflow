"use server";

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import type { ActionResponse } from "@/lib/types";

export interface MemoryItem {
  id: string;
  category: string;
  key: string;
  value: string;
  source: string;
  confidence: number;
  isConfirmed: boolean;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Get all memory items for the current user, grouped by category */
export async function getAIMemory(): Promise<ActionResponse<{ memories: MemoryItem[]; categories: string[] }>> {
  try {
    const user = await createOrGetUser();
    const memories = await prisma.aIUserMemory.findMany({
      where: { userId: user.id },
      orderBy: [{ category: "asc" }, { confidence: "desc" }, { updatedAt: "desc" }],
    });

    const categories = [...new Set(memories.map(m => m.category))].sort();
    return { success: true, data: { memories: memories as MemoryItem[], categories } };
  } catch {
    return { success: false, error: "Failed to load AI memory." };
  }
}

/** Update a memory item's value */
export async function updateMemoryItem(
  id: string,
  value: string
): Promise<ActionResponse<MemoryItem>> {
  try {
    const user = await createOrGetUser();
    // Ownership check
    const existing = await prisma.aIUserMemory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return { success: false, error: "Memory item not found." };

    const updated = await prisma.aIUserMemory.update({
      where: { id },
      data: {
        value: value.trim(),
        source: "USER", // User edited = user source
        confidence: 1.0, // User edit = highest confidence
        isConfirmed: true,
        lastVerifiedAt: new Date(),
      },
    });
    return { success: true, data: updated as MemoryItem };
  } catch {
    return { success: false, error: "Failed to update memory item." };
  }
}

/** Confirm a memory item is correct */
export async function confirmMemoryItem(id: string): Promise<ActionResponse<MemoryItem>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.aIUserMemory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return { success: false, error: "Memory item not found." };

    const updated = await prisma.aIUserMemory.update({
      where: { id },
      data: { isConfirmed: true, lastVerifiedAt: new Date() },
    });
    return { success: true, data: updated as MemoryItem };
  } catch {
    return { success: false, error: "Failed to confirm memory item." };
  }
}

/** Delete a memory item */
export async function deleteMemoryItem(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    const existing = await prisma.aIUserMemory.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return { success: false, error: "Memory item not found." };

    await prisma.aIUserMemory.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to delete memory item." };
  }
}

/** Delete all memory in a category */
export async function clearMemoryCategory(category: string): Promise<ActionResponse<{ deleted: number }>> {
  try {
    const user = await createOrGetUser();
    const result = await prisma.aIUserMemory.deleteMany({
      where: { userId: user.id, category },
    });
    return { success: true, data: { deleted: result.count } };
  } catch {
    return { success: false, error: "Failed to clear memory category." };
  }
}

/** Add a manual memory item (user input, confidence = 1.0) */
export async function addMemoryItem(
  category: string,
  key: string,
  value: string
): Promise<ActionResponse<MemoryItem>> {
  try {
    const user = await createOrGetUser();

    // Upsert by category+key
    const existing = await prisma.aIUserMemory.findFirst({
      where: { userId: user.id, category, key: { equals: key, mode: "insensitive" } },
    });

    if (existing) {
      const updated = await prisma.aIUserMemory.update({
        where: { id: existing.id },
        data: { value, source: "USER", confidence: 1.0, isConfirmed: true, lastVerifiedAt: new Date() },
      });
      return { success: true, data: updated as MemoryItem };
    }

    const created = await prisma.aIUserMemory.create({
      data: {
        userId: user.id,
        category,
        key,
        value,
        source: "USER",
        confidence: 1.0,
        isConfirmed: true,
        lastVerifiedAt: new Date(),
      },
    });
    return { success: true, data: created as MemoryItem };
  } catch {
    return { success: false, error: "Failed to add memory item." };
  }
}
