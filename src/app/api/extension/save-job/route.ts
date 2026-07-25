import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOrGetUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const user = await createOrGetUser();
    const body = await req.json();

    // Check duplicate
    if (body.applicationUrl) {
      const existing = await prisma.savedJob.findFirst({
        where: { userId: user.id, applicationUrl: body.applicationUrl },
      });
      if (existing) return Response.json({ success: false, error: "Already saved" });
    }

    const job = await prisma.savedJob.create({
      data: {
        userId: user.id,
        externalId: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        source: body.source ?? "Browser Extension",
        title: body.title,
        company: body.company,
        location: body.location ?? null,
        remoteType: body.remoteType ?? null,
        salaryMin: body.salaryMin ?? null,
        salaryMax: body.salaryMax ?? null,
        description: body.description ?? null,
        applicationUrl: body.applicationUrl ?? null,
        companyLogo: body.companyLogo ?? null,
        skills: body.skills ?? null,
      },
    });

    revalidatePath("/dashboard/discover");
    revalidatePath("/dashboard");
    return Response.json({ success: true, data: job });
  } catch (e) {
    return Response.json({ success: false, error: "Failed to save" }, { status: 500 });
  }
}
