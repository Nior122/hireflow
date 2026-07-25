import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, paginateParams, jsonPaginated } from "@/lib/api/auth";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: auth.userId, status: "ACTIVE" },
    include: { organization: true },
  });

  return Response.json({ data: memberships.map(m => ({ ...m.organization, role: m.role })) });
}
