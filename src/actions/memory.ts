"use server";

import { createOrGetUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import type { ActionResponse } from "@/lib/types";
import { GroqProvider } from "@/lib/ai/providers";
import { z } from "zod";

const MemoryExtractionSchema = z.object({
  memories: z.array(z.object({
    category: z.string(),
    key: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1)
  }))
});

/**
 * Legacy entry-point kept for backward compatibility.
 * Now delegates to the new AIUserMemory model.
 */
export async function extractAndStoreMemory(
  text: string,
  source: string
): Promise<ActionResponse<{ added: number }>> {
  try {
    const user = await createOrGetUser();

    const provider = new GroqProvider();

    const systemPrompt = `You are a career intelligence system. Extract persistent career facts about the user.
    Focus on: skills, technicalSkills, softSkills, experience, education, preferredRoles, preferredLocations, preferredWorkModes, achievements, projects, salaryExpectation.
    Do NOT extract temporary information (e.g. "I am applying to Google today").
    Return ONLY valid JSON: { "memories": [{ "category": string, "key": string, "value": string, "confidence": number }] }`;

    const raw = await provider.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ], { temperature: 0.1, maxTokens: 1024 });

    let extracted: z.infer<typeof MemoryExtractionSchema>;
    try {
      const parsed = JSON.parse(raw.trim());
      extracted = MemoryExtractionSchema.parse(parsed);
    } catch {
      return { success: true, data: { added: 0 } };
    }

    const existingMemories = await prisma.aIUserMemory.findMany({
      where: { userId: user.id },
      select: { key: true, category: true }
    });
    const existingKeys = new Set(
      existingMemories.map((m: { key: string; category: string }) =>
        `${m.category}:${m.key}`.toLowerCase()
      )
    );

    let addedCount = 0;
    for (const mem of extracted.memories) {
      const lookupKey = `${mem.category}:${mem.key}`.toLowerCase();
      if (!existingKeys.has(lookupKey)) {
        await prisma.aIUserMemory.create({
          data: {
            userId: user.id,
            category: mem.category,
            key: mem.key,
            value: mem.value,
            source,
            confidence: mem.confidence,
            isConfirmed: mem.confidence >= 0.9 && source === "USER"
          }
        });
        addedCount++;
      }
    }

    return { success: true, data: { added: addedCount } };
  } catch (error) {
    console.error("[memory] extractAndStoreMemory error:", error);
    return { success: false, error: "Failed to extract and store memory" };
  }
}

export async function getCareerMemoryContext(userId: string): Promise<string> {
  const memories = await prisma.aIUserMemory.findMany({
    where: { userId },
    orderBy: [{ confidence: "desc" }, { createdAt: "desc" }]
  });

  if (memories.length === 0) return "";

  const grouped = memories.reduce(
    (acc: Record<string, typeof memories>, curr) => {
      if (!acc[curr.category]) acc[curr.category] = [];
      acc[curr.category].push(curr);
      return acc;
    },
    {}
  );

  let context = "PERSISTENT CAREER MEMORY:\n";
  for (const [category, mems] of Object.entries(grouped)) {
    context += `- ${category.toUpperCase()}:\n`;
    for (const mem of mems) {
      const tag = mem.isConfirmed
        ? "(Confirmed)"
        : mem.confidence < 0.6
          ? "(Needs confirmation)"
          : "";
      context += `  * ${mem.key}: ${mem.value} ${tag}\n`;
    }
  }

  return context;
}
