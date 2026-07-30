import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export interface ApiAuthResult {
  authenticated: boolean;
  userId?: string;
  apiKeyId?: string;
  scopes?: string;
  error?: string;
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("Authorization");
  const apiKeyParam = req.nextUrl.searchParams.get("api_key");

  let key: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    key = authHeader.slice(7);
  } else if (apiKeyParam) {
    key = apiKeyParam;
  }

  if (!key) {
    return { authenticated: false, error: "Missing API key. Pass as Authorization: Bearer <key> or ?api_key=<key>" };
  }

  const record = await prisma.apiKey.findUnique({ where: { key } });
  if (!record) return { authenticated: false, error: "Invalid API key" };
  if (record.revokedAt) return { authenticated: false, error: "API key has been revoked" };
  if (record.expiresAt && record.expiresAt < new Date()) return { authenticated: false, error: "API key has expired" };

  // Update last used
  await prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });

  return { authenticated: true, userId: record.userId, apiKeyId: record.id, scopes: record.scopes };
}

export function hasScope(scopes: string, required: string): boolean {
  const scopeList = scopes.split(",").map(s => s.trim());
  return scopeList.includes(required) || scopeList.includes("admin");
}

export function paginateParams(req: NextRequest) {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20")));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function jsonPaginated(data: unknown[], total: number, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
