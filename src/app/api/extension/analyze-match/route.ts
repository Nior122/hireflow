import { NextRequest } from "next/server";
import { requireDbUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import { groqChatJson, getGroqApiKey } from "@/lib/ai/groq";

export async function POST(req: NextRequest) {
  const user = await requireDbUser();
  if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  if (!getGroqApiKey() && process.env.DEMO_MODE !== "true") {
    return Response.json({ success: false, error: "AI not configured. Set GROQ_API_KEY." }, { status: 500 });
  }

  try {
    const { jobDescription, jobTitle } = await req.json();

    const app = await prisma.jobApplication.findFirst({
      where: { userId: user.id, notes: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { notes: true },
    });
    const resumeText = app?.notes ?? "No resume text available";

    const groq = await groqChatJson({
      messages: [
        { role: "system", content: "Compare a resume to a job description. Return JSON: { matchPercentage: 0-100, missingSkills: [], improvements: [] }" },
        { role: "user", content: `Resume:\n${resumeText.slice(0, 3000)}\n\nJob: ${jobTitle}\nDescription:\n${jobDescription.slice(0, 3000)}` },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    if (!groq.ok) return Response.json({ success: false, error: groq.error ?? "AI error" }, { status: groq.status });

    const content = groq.content || "{}";
    try {
      const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
      return Response.json({ success: true, data: parsed });
    } catch {
      return Response.json({ success: true, data: { matchPercentage: 50, missingSkills: [], improvements: [content.slice(0, 500)] } });
    }
  } catch {
    return Response.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
