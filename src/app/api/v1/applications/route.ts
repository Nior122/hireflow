import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey, hasScope, paginateParams, jsonPaginated } from "@/lib/api/auth";
import { createApplicationSchema } from "@/lib/validation/schemas";
import { sanitizeInput } from "@/lib/security/sanitize";

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });

  const { page, limit, offset } = paginateParams(req);
  const status = req.nextUrl.searchParams.get("status");
  const search = req.nextUrl.searchParams.get("search");

  const where: any = { userId: auth.userId };
  if (status) where.status = status;
  if (search) where.OR = [{ company: { contains: search, mode: "insensitive" } }, { role: { contains: search, mode: "insensitive" } }];

  const [data, total] = await Promise.all([
    prisma.jobApplication.findMany({ where, orderBy: { createdAt: "desc" }, skip: offset, take: limit }),
    prisma.jobApplication.count({ where }),
  ]);

  return Response.json(jsonPaginated(data, total, page, limit));
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (!auth.authenticated) return Response.json({ error: auth.error }, { status: 401 });
  if (!hasScope(auth.scopes ?? "", "write")) return Response.json({ error: "Write scope required" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = createApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { company, role, status, notes, link, source } = parsed.data;
    const safeCompany = sanitizeInput(company);
    const safeRole = sanitizeInput(role);
    const safeNotes = notes ? sanitizeInput(notes) : undefined;

    const lastApp = await prisma.jobApplication.findFirst({
      where: { userId: auth.userId!, status: status ?? "UNAPPLIED" },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const application = await prisma.jobApplication.create({
      data: {
        userId: auth.userId!,
        company: safeCompany,
        role: safeRole,
        status: status ?? "UNAPPLIED",
        notes: safeNotes,
        link,
        source,
        position: (lastApp?.position ?? -1) + 1,
      },
    });
    return Response.json({ data: application }, { status: 201 });
  } catch (e) {
    console.error("API error:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
