import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, hasScope } from "@/lib/api/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });

  const app = await prisma.jobApplication.findFirst({ where: { id: params.id, userId: auth.userId } });
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: app });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });
  if (!hasScope(auth.scopes ?? "", "write")) return Response.json({ error: "Write scope required" }, { status: 403 });

  const app = await prisma.jobApplication.findFirst({ where: { id: params.id, userId: auth.userId } });
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.jobApplication.update({ where: { id: params.id }, data: body });
  return Response.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });
  if (!hasScope(auth.scopes ?? "", "admin")) return Response.json({ error: "Admin scope required" }, { status: 403 });

  const app = await prisma.jobApplication.findFirst({ where: { id: params.id, userId: auth.userId } });
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.jobApplication.delete({ where: { id: params.id } });
  return Response.json({ deleted: true });
}
