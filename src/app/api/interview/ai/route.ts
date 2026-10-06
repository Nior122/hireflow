import { NextRequest } from "next/server";
import { requireDbUser } from "@/lib/clerk";
import { groqChatJson, getGroqApiKey } from "@/lib/ai/groq";

export const maxDuration = 60;

function formatTranscript(value: unknown): string {
  if (typeof value === "string") return value.trim().slice(-16_000);
  if (!Array.isArray(value)) return "No transcript was provided.";

  const lines = value.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as { role?: unknown; content?: unknown };
    if (typeof item.content !== "string" || !item.content.trim()) return [];
    const role = typeof item.role === "string" ? item.role : "speaker";
    return [`${role}: ${item.content.trim()}`];
  });
  return lines.join("\n\n").slice(-16_000) || "No transcript was provided.";
}

export async function POST(req: NextRequest) {
  const user = await requireDbUser();
  if (!user) return Response.json({ error: "Please sign in to use AI." }, { status: 401 });

  if (!getGroqApiKey() && process.env.DEMO_MODE !== "true") {
    return Response.json({ error: "AI provider is not configured. Check AI settings and Vercel environment variables." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "";
    const data = body?.data && typeof body.data === "object" ? body.data : {};
    const transcript = formatTranscript(data.transcript ?? body.transcript);

    const prompts: Record<string, { system: string; user: string }> = {
      generate_question: {
        system: "You are an expert technical interviewer. Generate a single interview question based on the given parameters. Return JSON: { \"question\": \"...\", \"category\": \"...\", \"difficulty\": \"...\", \"tips\": \"...\", \"followUp\": \"...\", \"evaluationCriteria\": \"...\" }",
        user: `Company: ${data.company || "General"}\nRole: ${data.role || "Software Engineer"}\nType: ${data.type || "Technical"}\nCategory: ${data.category || "General"}\nDifficulty: ${data.difficulty || "Medium"}\n\nGenerate one challenging but fair interview question.`,
      },
      evaluate_answer: {
        system: "You are an expert interview coach. Evaluate the user's interview answer. Be specific and constructive. Return JSON: { \"overallScore\": 0-100, \"communication\": 0-100, \"technical\": 0-100, \"confidence\": 0-100, \"completeness\": 0-100, \"feedback\": \"...\", \"strengths\": [\"...\"], \"improvements\": [\"...\"], \"improvedAnswer\": \"...\", \"starAnalysis\": \"...\" }",
        user: `Question: ${data.question}\nUser Answer: ${data.answer}\nCategory: ${data.category || "Technical"}\nRole: ${data.role || "Software Engineer"}`,
      },
      company_research: {
        system: "You are a career research analyst. Provide comprehensive company research. Return JSON: { \"overview\": \"...\", \"industry\": \"...\", \"products\": [\"...\"], \"culture\": \"...\", \"recentNews\": [\"...\"], \"techStack\": [\"...\"], \"competitors\": [\"...\"], \"interviewTips\": [\"...\"], \"questionsToAsk\": [\"...\"], \"salaryRange\": \"...\", \"growthOpportunities\": \"...\" }",
        user: `Research the following company for an interview:\nCompany: ${data.company}\nRole: ${data.role || "Software Engineer"}\nProvide detailed, actionable research.`,
      },
      generate_questions: {
        system: "You are an expert interviewer. Generate a set of interview questions based on the parameters. Return JSON: { \"questions\": [{ \"question\": \"...\", \"category\": \"...\", \"difficulty\": \"...\", \"answerGuide\": \"...\", \"tags\": [\"...\"] }] }",
        user: `Company: ${data.company || "General"}\nRole: ${data.role || "Software Engineer"}\nType: ${data.type || "Technical"}\nCount: ${data.count || 5}\nCategories: ${data.categories || "Mixed"}`,
      },
      star_coach: {
        system: "You are an expert STAR method coach. Improve the user's STAR response. Return JSON: { \"improvedSituation\": \"...\", \"improvedTask\": \"...\", \"improvedAction\": \"...\", \"improvedResult\": \"...\", \"overallFeedback\": \"...\", \"clarity\": 0-100, \"impact\": 0-100, \"leadership\": 0-100, \"communication\": 0-100, \"improvedFull\": \"...\" }",
        user: `Experience: ${data.experience}\nSituation: ${data.situation}\nTask: ${data.task}\nAction: ${data.action}\nResult: ${data.result}\nRole: ${data.role || "Software Engineer"}`,
      },
      generate_followup_email: {
        system: "You are a professional email writer. Generate a follow-up email after an interview. Return ONLY the email text, properly formatted with greeting, body, and closing.",
        user: `Type: ${data.type || "thank-you"}\nCompany: ${data.company}\nRole: ${data.role}\nInterview Notes: ${data.notes || "N/A"}\nTone: ${data.tone || "professional"}\nKey discussion points: ${data.keyPoints || "N/A"}`,
      },
      generate_learning_report: {
        system: "You are an interview coach. Write a concise, evidence-based learning report from the supplied mock interview transcript. Highlight demonstrated strengths, specific opportunities to improve, and a practical next-step plan. Refer to details the candidate actually gave; do not invent experience or feedback. Use clear headings and do not ask another interview question.",
        user: `Company: ${data.company || "General"}\nRole: ${data.role || "Software Engineer"}\nJob requirements: ${data.jobRequirements || "Not provided"}\nFinal score: ${data.score ?? "Not provided"}\n\nInterview transcript:\n${transcript}`,
      },
      mock_interview_start: {
        system: `You are a friendly but professional AI interviewer conducting a mock interview. Start with a warm introduction, then ask exactly one first question on its own line. Be conversational and tailor the question to the role, type, difficulty, job requirements, and career gaps. Conduct five questions total; after the fifth answer, provide a comprehensive score and summary. Do not ask multiple questions in the opening.`,
        user: `Mock Interview Setup:\nCompany: ${data.company || "General"}\nRole: ${data.role || "Software Engineer"}\nType: ${data.type || "Technical"}\nDifficulty: ${data.difficulty || "Medium"}\nJob requirements: ${data.jobRequirements || "Not provided"}\nCareer gaps: ${data.careerGaps || "Not provided"}\n\nGive the welcome and first question.`,
      },
      mock_interview_continue: {
        system: `You are an AI interviewer continuing a five-question mock interview. Read the entire transcript. Your feedback MUST address a specific detail from the candidate's latest answer, not generic praise. For answers 1 through 4, briefly evaluate that detail, then ask exactly one new, relevant question on its own line. Never repeat or paraphrase any question already present in the transcript. On answer 5, provide the final evaluation with clear scores and an overall summary, and do not ask another question.`,
        user: `Full transcript so far:\n${transcript}\n\nMost recent question: ${data.previousQuestion || "Not provided"}\nCandidate's latest answer: ${data.answer || "Not provided"}\nQuestion ${data.questionNumber || 1} of 5\nRole: ${data.role || "Software Engineer"}\nType: ${data.type || "Technical"}\nJob requirements: ${data.jobRequirements || "Not provided"}\n\nRespond to the candidate's latest answer and continue according to the question count.`,
      },
    };

    const prompt = prompts[action];
    if (!prompt) return Response.json({ error: "Unknown action" }, { status: 400 });

    const groq = await groqChatJson({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    if (!groq.ok) return Response.json({ error: groq.error ?? "AI error" }, { status: groq.status });
    if (!groq.content.trim()) {
      return Response.json({ error: "The AI provider returned an empty response. Please try again." }, { status: 502 });
    }

    const content = groq.content;
    const jsonActions = ["generate_question", "evaluate_answer", "company_research", "generate_questions", "star_coach"];
    if (jsonActions.includes(action)) {
      try {
        const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        return Response.json({ result: parsed });
      } catch {
        return Response.json({ result: content });
      }
    }

    return Response.json({ result: content });
  } catch (e) {
    console.error("Interview AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
