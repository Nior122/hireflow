import { NextRequest } from "next/server";
import { requireDbUser } from "@/lib/clerk";
import { groqChatJson, getGroqApiKey } from "@/lib/ai/groq";
import { toPlainText } from "@/lib/ai/plain";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await requireDbUser();
  if (!user) return Response.json({ error: "Please sign in to use AI." }, { status: 401 });

  if (!getGroqApiKey() && process.env.DEMO_MODE !== "true") {
    return Response.json({ error: "AI provider is not configured. Check AI settings and Vercel environment variables." }, { status: 500 });
  }

  try {
    const { action, resumeText, jobDescription, extra } = await req.json();

    let careerProfileText = "N/A";
    const profile = await prisma.aIUserProfile.findUnique({ where: { userId: user.id } });
    if (profile) {
      careerProfileText = JSON.stringify({
        skills: profile.skills,
        technicalSkills: profile.technicalSkills,
        experience: profile.experience,
        education: profile.education
      });
    }

    const prompts: Record<string, { system: string; user: string }> = {
      improve_summary: {
        system: "You are an expert resume writer. Improve the following resume summary. Make it more impactful, concise, and ATS-friendly. Return ONLY the improved summary text, nothing else.",
        user: `Resume summary:\n${resumeText}`,
      },
      rewrite_bullets: {
        system: "You are an expert resume writer. Rewrite the following bullet points to be more impactful with action verbs and quantified results. Return ONLY the rewritten bullets as a JSON array of strings.",
        user: `Bullet points:\n${resumeText}`,
      },
      generate_achievements: {
        system: "You are an expert career coach. Based on the following role description, generate 5 impressive achievement bullet points using the STAR method with quantified results. Return ONLY a JSON array of strings.",
        user: `Role description:\n${resumeText}\n\nExtra context: ${extra || "N/A"}`,
      },
      fix_grammar: {
        system: "You are a professional editor. Fix all grammar, spelling, and punctuation errors in the following text. Return ONLY the corrected text.",
        user: resumeText,
      },
      tailor_for_job: {
        system: "You are an expert resume tailoring specialist. Tailor the following resume content for this specific job description. Highlight relevant skills and experience. Return a JSON object with: { \"summary\": \"improved summary\", \"skills\": [\"skill1\", ...], \"suggestions\": [\"suggestion1\", ...] }",
        user: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`,
      },
      generate_cover_letter: {
        system: "You are an expert cover letter writer. Write a professional, personalized cover letter. Return ONLY the cover letter text, properly formatted with paragraphs.",
        user: `Resume:\n${resumeText}\n\nCompany: ${extra}\nJob Description:\n${jobDescription}`,
      },
      ats_keywords: {
        system: "You are an ATS optimization expert. Extract and suggest important keywords from the job description that should be added to the resume. Compare the missing keywords to the user's Career Profile. Return a JSON object: { \"found\": [\"existing keywords\"], \"missing\": [\"keywords to add\"], \"not_in_profile\": [\"missing keywords that are NOT in the user's Career Profile\"], \"suggested\": [\"how to add them\"] }",
        user: `Career Profile:\n${careerProfileText}\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}`,
      },
      highlight_skills: {
        system: "You are an expert career counselor. Analyze the user's Career Profile against the Job Description and Resume. Return a JSON object identifying which skills from the profile should be highlighted in the resume: { \"highlighted_skills\": [\"skill1\", ...], \"justification\": \"Brief explanation\" }.",
        user: `Career Profile:\n${careerProfileText}\n\nJob Description:\n${jobDescription || "N/A"}\n\nResume:\n${resumeText}`,
      },
    };

    const prompt = prompts[action];
    if (!prompt) return Response.json({ error: "Unknown action" }, { status: 400 });

    const groq = await groqChatJson({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });

    if (!groq.ok) return Response.json({ error: groq.error ?? "AI service error" }, { status: groq.status });

    const content = groq.content;

    // Try to parse as JSON if the action expects it
    const jsonActions = ["rewrite_bullets", "generate_achievements", "tailor_for_job", "ats_keywords", "highlight_skills"];
    if (jsonActions.includes(action)) {
      try {
        const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        return Response.json({ result: parsed });
      } catch {
        return Response.json({ result: toPlainText(content) });
      }
    }

    return Response.json({ result: toPlainText(content) });
  } catch (e) {
    console.error("Resume AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
