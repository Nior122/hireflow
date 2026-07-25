import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, paginateParams, jsonPaginated } from "@/lib/api/auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });

  const { page, limit, offset } = paginateParams(req);
  const where: any = {};

  const [data, total] = await Promise.all([
    prisma.savedJob.findMany({ where: { userId: auth.userId }, orderBy: { createdAt: "desc" }, skip: offset, take: limit }),
    prisma.savedJob.count({ where: { userId: auth.userId } }),
  ]);

  return Response.json(jsonPaginated(data, total, page, limit));
}
