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
    const { company, position, jobDescription, tone } = await req.json();
    const user = await prisma.user.findFirst({ where: { clerkId: userId } });
    if (!user) return Response.json({ success: false, error: "User not found" }, { status: 404 });

    const app = await prisma.jobApplication.findFirst({
      where: { userId: user.id, notes: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { notes: true },
    });
    const resumeText = app?.notes ?? "";

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        messages: [
          { role: "system", content: "Write a professional cover letter. Return ONLY the cover letter text, properly formatted." },
          { role: "user", content: `Company: ${company}\nPosition: ${position}\nTone: ${tone || "professional"}\nResume: ${resumeText.slice(0, 2000)}\nJob Description: ${(jobDescription || "").slice(0, 2000)}` },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) return Response.json({ success: false, error: "AI error" }, { status: 502 });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return Response.json({ success: true, data: content });
  } catch {
    return Response.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
