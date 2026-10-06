import { plainGroqReply } from "./plain";
import { getAiConfig, getAiConnection } from "@/lib/ai-config";

/** Legacy name retained for callsites; checks whichever provider is configured. */
export function getGroqApiKey(): string | null {
  try { return getAiConnection().apiKey; } catch { return null; }
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

const MAX_REASONING_TOKEN_BUDGET = 8192;

function requestedTokenBudget(payload: Record<string, unknown>): number | null {
  const value = payload.max_tokens ?? payload.max_completion_tokens;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

function requestBody(payload: Record<string, unknown>, config: ReturnType<typeof getAiConfig>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...payload, model: config.model };
  if (config.provider === "groq") {
    const budget = requestedTokenBudget(payload);
    if (budget !== null) {
      const field = typeof payload.max_tokens === "number" ? "max_tokens" : "max_completion_tokens";
      body[field] = Math.min(MAX_REASONING_TOKEN_BUDGET, budget * 3);
    }
    body.reasoning_effort = payload.reasoning_effort ?? "low";
    body.reasoning_format = payload.reasoning_format ?? "hidden";
  }
  return body;
}

/** Return a retry payload whose effective provider token budget is larger, if possible. */
export function largerBudgetPayload(payload: Record<string, unknown>): Record<string, unknown> | null {
  let config: ReturnType<typeof getAiConfig>;
  try { config = getAiConfig(); } catch { return null; }

  const requested = requestedTokenBudget(payload);
  if (requested === null) return null;

  const multiplier = config.provider === "groq" ? 3 : 1;
  const effectiveBudget = Math.min(MAX_REASONING_TOKEN_BUDGET, requested * multiplier);
  const largerEffectiveBudget = Math.min(
    MAX_REASONING_TOKEN_BUDGET,
    Math.max(effectiveBudget + 1, Math.ceil(effectiveBudget * 1.5)),
  );
  if (largerEffectiveBudget <= effectiveBudget) return null;

  const nextRequestedBudget = config.provider === "groq"
    ? Math.ceil(largerEffectiveBudget / multiplier)
    : largerEffectiveBudget;
  const field = typeof payload.max_tokens === "number" ? "max_tokens" : "max_completion_tokens";
  return { ...payload, [field]: Math.max(requested + 1, nextRequestedBudget) };
}

async function responseError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body);
    const error = parsed?.error;
    if (typeof error === "string") return error;
    if (error && typeof error.message === "string") return error.message;
    return JSON.stringify(error ?? parsed);
  } catch {
    return body.trim().slice(0, 500) || "AI service error";
  }
}

export async function groqFetch(
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number },
): Promise<Response> {
  let config: ReturnType<typeof getAiConfig>;
  try { config = getAiConfig(); }
  catch (e) {
    if (process.env.DEMO_MODE === "true" && process.env.NODE_ENV !== "production") return demoResponse(payload);
    return Response.json({ error: e instanceof Error ? e.message : "AI provider is not configured" }, { status: 503 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 30_000);
  try {
    const url = `${config.baseUrl}/chat/completions`;
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };
    let body = requestBody(payload, config);
    let response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // Some OpenAI-compatible providers reject the Groq reasoning extensions.
    // Retry once without those optional fields, retaining the increased budget.
    if (
      response.status === 400 &&
      ("reasoning_effort" in body || "reasoning_format" in body)
    ) {
      const fallbackBody = { ...body };
      delete fallbackBody.reasoning_effort;
      delete fallbackBody.reasoning_format;
      body = fallbackBody;
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    }

    if (response.ok) return response;
    const status = response.status;
    const error = await responseError(response);
    return Response.json({ error }, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI provider request timed out";
    return Response.json({ error: message }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}

interface CompletionContent {
  content: string;
  finishReason: string | null;
}

async function completionContent(response: Response): Promise<CompletionContent> {
  const data = await response.json();
  const choice = data?.choices?.[0];
  const value = choice?.message?.content;
  let content = "";
  if (typeof value === "string") content = value;
  else if (Array.isArray(value)) {
    content = value.map((part: unknown) => {
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") return part.text;
      return "";
    }).join("");
  }
  return { content, finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : null };
}

function emptyReplyError(finishReason: string | null, retried: boolean): string {
  const reason = finishReason ? ` (finish_reason: ${finishReason})` : "";
  const retryDetail = retried
    ? " after retrying with a larger token budget"
    : " and no larger token budget is available";
  return `The AI provider returned an empty response${reason}${retryDetail}. Please try again.`;
}

export async function groqChatJson(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  content: string;
  error?: string;
}> {
  const first = await groqFetch(payload);
  if (!first.ok) return { ok: false, status: first.status, content: "", error: await responseError(first) };

  let completion: CompletionContent;
  try {
    completion = await completionContent(first);
  } catch {
    return { ok: false, status: 502, content: "", error: "The AI provider returned an invalid completion response. Please try again." };
  }
  if (completion.content.trim()) {
    return { ok: true, status: 200, content: plainGroqReply(completion.content) };
  }

  const retryPayload = largerBudgetPayload(payload);
  if (!retryPayload) {
    return { ok: false, status: 502, content: "", error: emptyReplyError(completion.finishReason, false) };
  }

  const retry = await groqFetch(retryPayload);
  if (!retry.ok) return { ok: false, status: retry.status, content: "", error: await responseError(retry) };
  try {
    completion = await completionContent(retry);
  } catch {
    return { ok: false, status: 502, content: "", error: "The AI provider returned an invalid completion response after retrying. Please try again." };
  }

  if (!completion.content.trim()) {
    return { ok: false, status: 502, content: "", error: emptyReplyError(completion.finishReason, true) };
  }
  return { ok: true, status: 200, content: plainGroqReply(completion.content) };
}
