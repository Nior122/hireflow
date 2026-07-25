import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ duplicate: false });

  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const company = searchParams.get("company");
    const title = searchParams.get("title");

    const user = await prisma.user.findFirst({ where: { clerkId: userId } });
    if (!user) return Response.json({ duplicate: false });

    // Check by URL first
    if (url) {
      const byUrl = await prisma.savedJob.findFirst({ where: { userId: user.id, applicationUrl: url } });
      if (byUrl) return Response.json({ duplicate: true });
    }

    // Check by company + title
    if (company && title) {
      const byName = await prisma.savedJob.findFirst({
        where: {
          userId: user.id,
          company: { equals: company, mode: "insensitive" },
          title: { contains: title, mode: "insensitive" },
        },
      });
      if (byName) return Response.json({ duplicate: true });
    }

    return Response.json({ duplicate: false });
  } catch {
    return Response.json({ duplicate: false });
  }
}
