import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, hasScope, paginateParams, jsonPaginated } from "@/lib/api/auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });

  const { page, limit, offset } = paginateParams(req);
  const status = req.nextUrl.searchParams.get("status");
  const where: any = { employerId: auth.userId };
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    prisma.candidate.findMany({ where, orderBy: { createdAt: "desc" }, skip: offset, take: limit }),
    prisma.candidate.count({ where }),
  ]);

  return Response.json(jsonPaginated(data, total, page, limit));
}
