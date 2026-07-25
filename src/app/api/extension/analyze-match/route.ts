import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return Response.json({ success: false, error: "AI not configured" }, { status: 500 });
  }

  try {
    const { jobDescription, jobTitle } = await req.json();
    const user = await prisma.user.findFirst({ where: { clerkId: userId } });
    if (!user) return Response.json({ success: false, error: "User not found" }, { status: 404 });

    const app = await prisma.jobApplication.findFirst({
      where: { userId: user.id, notes: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { notes: true },
    });
    const resumeText = app?.notes ?? "No resume text available";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: "Compare a resume to a job description. Return JSON: { matchPercentage: 0-100, missingSkills: [], improvements: [] }" },
          { role: "user", content: `Resume:\n${resumeText.slice(0, 3000)}\n\nJob: ${jobTitle}\nDescription:\n${jobDescription.slice(0, 3000)}` },
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (!response.ok) return Response.json({ success: false, error: "AI error" }, { status: 502 });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
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
