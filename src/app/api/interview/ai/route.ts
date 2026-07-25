import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GROQ_API_URL, GROQ_MODEL } from "@/lib/ai-config";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "placeholder") {
    return Response.json({ error: "AI not configured" }, { status: 500 });
  }

  try {
    const { action, data } = await req.json();

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
      mock_interview_start: {
        system: `You are a friendly but professional AI interviewer conducting a mock interview. Start with a warm introduction and ask the first question. Be conversational. After each answer, provide brief positive feedback then ask the next question. Conduct 5 questions total. At the end, provide a comprehensive score and summary.

Start with:
"Hello! I'm your AI interview coach. I'll be conducting a mock interview today. I'll ask you a series of questions, evaluate your responses, and provide detailed feedback. Let's get started!

[First question based on the role and type]"

Then wait for the user's answer.`,
        user: `Mock Interview Setup:\nCompany: ${data.company || "General"}\nRole: ${data.role || "Software Engineer"}\nType: ${data.type || "Technical"}\nDifficulty: ${data.difficulty || "Medium"}\n\nGenerate the opening and first question.`,
      },
      mock_interview_continue: {
        system: `You are an AI interviewer. The user just answered a question. Evaluate their answer, provide brief feedback, then ask the next question. Track the question count. On the 5th answer, provide a comprehensive final evaluation with scores.

Format each response as:
[Score feedback on previous answer]
[Next question]

On final response, provide full evaluation.`,
        user: `Previous question: ${data.previousQuestion}\nUser's answer: ${data.answer}\nQuestion ${data.questionNumber || 1} of 5\nRole: ${data.role || "Software Engineer"}\nType: ${data.type || "Technical"}\n\nEvaluate and continue.`,
      },
    };

    const prompt = prompts[action];
    if (!prompt) return Response.json({ error: "Unknown action" }, { status: 400 });

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) return Response.json({ error: "AI error" }, { status: 502 });

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content ?? "";

    // Try JSON parse
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
