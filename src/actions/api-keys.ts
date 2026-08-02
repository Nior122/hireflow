'use server';

import { prisma } from "@/lib/prisma";
import { createOrGetUser } from "@/lib/clerk";
import { revalidatePath } from "next/cache";
import type { ActionResponse } from "@/lib/types";
import crypto from "crypto";

export interface ApiKeyItem {
  id: string;
  name: string;
  key: string;
  scopes: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export async function getApiKeys(): Promise<ActionResponse<ApiKeyItem[]>> {
  try {
    const user = await createOrGetUser();
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: keys as ApiKeyItem[] };
  } catch {
    return { success: false, error: "Failed to load API keys" };
  }
}

export async function createApiKey(name: string, scopes: string = "read"): Promise<ActionResponse<{ key: ApiKeyItem; rawKey: string }>> {
  try {
    const user = await createOrGetUser();
    const rawSecret = crypto.randomBytes(24).toString("hex");
    const fullKey = `hf_${rawSecret}`;

    const created = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: name.trim() || "Default Key",
        key: fullKey,
        scopes,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: { key: created as ApiKeyItem, rawKey: fullKey } };
  } catch {
    return { success: false, error: "Failed to create API key" };
  }
}

export async function revokeApiKey(id: string): Promise<ActionResponse<void>> {
  try {
    const user = await createOrGetUser();
    await prisma.apiKey.updateMany({
      where: { id, userId: user.id },
      data: { revokedAt: new Date() },
    });
    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to revoke API key" };
  }
}
