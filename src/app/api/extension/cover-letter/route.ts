import { NextRequest } from "next/server";
import { requireDbUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { groqChatJson, getGroqApiKey } from "@/lib/ai/groq";

export async function POST(req: NextRequest) {
  const user = await requireDbUser();
  if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  if (!getGroqApiKey() && process.env.DEMO_MODE !== "true") {
    return Response.json({ success: false, error: "AI provider is not configured. Check AI settings and Vercel environment variables." }, { status: 500 });
  }

  try {
    const { company, position, jobDescription, tone } = await req.json();

    const app = await prisma.jobApplication.findFirst({
      where: { userId: user.id, notes: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { notes: true },
    });
    const resumeText = app?.notes ?? "";

    const groq = await groqChatJson({
      messages: [
        { role: "system", content: "Write a professional cover letter. Return ONLY the cover letter text, properly formatted." },
        { role: "user", content: `Company: ${company}\nPosition: ${position}\nTone: ${tone || "professional"}\nResume: ${resumeText.slice(0, 2000)}\nJob Description: ${(jobDescription || "").slice(0, 2000)}` },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });

    if (!groq.ok) return Response.json({ success: false, error: groq.error ?? "AI error" }, { status: groq.status });

    return Response.json({ success: true, data: groq.content });
  } catch {
    return Response.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
