import { GROQ_API_URL, getGroqModel } from "@/lib/ai-config";

export function getGroqApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key || key === "placeholder") return null;
  return key;
}

function lastUserText(payload: Record<string, unknown>): string {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = (messages[i] as { content?: unknown })?.content;
    if (typeof content === "string" && content.trim()) return content;
  }
  return "";
}

function wantsJson(payload: Record<string, unknown>): boolean {
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  const joined = messages
    .map((m) => (typeof (m as { content?: unknown })?.content === "string" ? (m as { content: string }).content : ""))
    .join("\n");
  return /json object|return json|output only valid json|return only a json|return ONLY a JSON/i.test(joined);
}

/** Local DEMO_MODE replies so Copilot / CV / interview UIs work without a Groq key. */
export function demoAiContent(payload: Record<string, unknown>): string {
  if (wantsJson(payload)) {
    return JSON.stringify({
      summary: "Demo mode — set GROQ_API_KEY for live AI.",
      matchPercentage: 72,
      matchScore: 72,
      missingSkills: ["Connect Groq with GROQ_API_KEY"],
      improvements: ["Add GROQ_API_KEY on Vercel for live suggestions."],
      highlighted_skills: ["communication"],
      justification: "Demo response while GROQ_API_KEY is unset.",
      found: [],
      missing: [],
      not_in_profile: [],
      suggested: ["Set GROQ_API_KEY and GROQ_MODEL in the environment."],
      skills: ["TypeScript"],
      suggestions: ["Set GROQ_API_KEY for live resume AI."],
      question: "Tell me about a challenging project you led.",
      category: "Behavioral",
      difficulty: "Medium",
      tips: "Use the STAR method.",
      followUp: "What was the outcome?",
      evaluationCriteria: "Clarity and impact",
      overallScore: 75,
      communication: 80,
      technical: 70,
      confidence: 75,
      completeness: 70,
      feedback: "Demo evaluation. Set GROQ_API_KEY for live coaching.",
      strengths: ["Clear structure"],
      improvedAnswer: "Demo improved answer.",
      starAnalysis: "Demo STAR analysis.",
      overview: "Demo company research. Set GROQ_API_KEY for live results.",
      industry: "Technology",
      products: ["Demo"],
      culture: "Demo",
      recentNews: ["Demo"],
      techStack: ["TypeScript"],
      competitors: ["Demo"],
      interviewTips: ["Research the company"],
      questionsToAsk: ["What does success look like in the first 90 days?"],
      salaryRange: "N/A",
      growthOpportunities: "N/A",
      questions: [
        {
          question: "Why this role?",
          category: "General",
          difficulty: "Easy",
          answerGuide: "Be specific about the company and the work.",
          tags: ["intro"],
        },
      ],
      improvedSituation: "Demo situation",
      improvedTask: "Demo task",
      improvedAction: "Demo action",
      improvedResult: "Demo result",
      overallFeedback: "Demo STAR coaching. Set GROQ_API_KEY for live feedback.",
      clarity: 70,
      impact: 70,
      leadership: 70,
      improvedFull: "Demo STAR story.",
    });
  }

  const asked = lastUserText(payload).slice(0, 180);
  return `Demo mode: AI is using a local stub because GROQ_API_KEY is not set. You asked: "${asked || "how can I help with your job search?"}". Add GROQ_API_KEY (and GROQ_MODEL) on Vercel for live Copilot, CV writer, and interview coaching.`;
}

function demoResponse(payload: Record<string, unknown>): Response {
  const content = demoAiContent(payload);
  if (payload.stream) {
    const sse =
      `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n` +
      `data: [DONE]\n\n`;
    return new Response(sse, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }
  return Response.json({ choices: [{ message: { content } }] });
}

export async function groqFetch(
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number }
): Promise<Response> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    if (process.env.DEMO_MODE === "true") return demoResponse(payload);
    return Response.json({ error: "AI is not configured. Set GROQ_API_KEY." }, { status: 500 });
  }

  let model: string;
  try {
    model = getGroqModel(typeof payload.model === "string" ? payload.model : undefined);
  } catch {
    return Response.json({ error: "AI is not configured. Set GROQ_MODEL." }, { status: 500 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 30_000);
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, model }),
      signal: controller.signal,
    });

    if (response.ok) return response;

    const lastBody = await response.text();
    try {
      const parsed = JSON.parse(lastBody);
      return Response.json(parsed?.error ? parsed : { error: lastBody }, { status: response.status });
    } catch {
      return Response.json({ error: lastBody.slice(0, 500) }, { status: response.status });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Groq request timed out";
    return Response.json({ error: message }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}

export async function groqChatJson(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  content: string;
  error?: string;
}> {
  const response = await groqFetch(payload);
  if (!response.ok) {
    let error = "AI service error";
    try {
      const data = await response.json();
      error = typeof data.error === "string" ? data.error : JSON.stringify(data.error ?? data);
    } catch {
      error = await response.text();
    }
    return { ok: false, status: response.status, content: "", error };
  }
  const data = await response.json();
  return {
    ok: true,
    status: 200,
    content: data.choices?.[0]?.message?.content ?? "",
  };
}
