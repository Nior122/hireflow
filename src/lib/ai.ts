import { z } from "zod";
import { GROQ_API_URL, GROQ_MODEL } from "@/lib/ai-config";

async function groqChat(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? "";
}

const EmailClassificationSchema = z.object({
  isJobRelated: z.boolean(),
  type: z.enum(["offer", "interview_invite", "rejection", "follow_up", "application_confirmation", "recruiter_message", "other"]),
  company: z.string().optional(),
  role: z.string().optional(),
  summary: z.string(),
  suggestedStatus: z.enum(["UNAPPLIED", "WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]),
});

export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

export async function classifyEmail(subject: string, body: string): Promise<EmailClassification> {
  const systemPrompt = `You are an assistant that analyzes emails about jobs. For each email, determine if it is job-related. If so, classify type (offer, interview_invite, rejection, follow_up, application_confirmation, recruiter_message, other), extract company, role, summary, and suggest a Kanban status. Output only valid JSON.`;

  const result = await groqChat(systemPrompt, `Subject: ${subject}\n\nBody: ${body}`);
  const parsed = JSON.parse(result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  return EmailClassificationSchema.parse(parsed);
}

const ApplicationExtractionSchema = z.object({
  applicantName: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  positionApplied: z.string(),
  resumeText: z.string().optional(),
  coverLetter: z.string().optional(),
  keySkills: z.array(z.string()),
  experienceSummary: z.string().optional(),
});

export type ApplicationExtraction = z.infer<typeof ApplicationExtractionSchema>;

export async function extractApplicationData(emailBody: string): Promise<ApplicationExtraction> {
  const systemPrompt = `Parse this job application email. Extract applicantName, email, phone, positionApplied, resumeText (plain text), coverLetter, keySkills (array), experienceSummary. Output only valid JSON.`;

  const result = await groqChat(systemPrompt, emailBody);
  const parsed = JSON.parse(result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  return ApplicationExtractionSchema.parse(parsed);
}

const ResumeMatchSchema = z.object({
  matchPercentage: z.number().min(0).max(100),
  missingKeywords: z.array(z.string()),
  tailoredBullets: z.array(z.string()),
});

export type ResumeMatch = z.infer<typeof ResumeMatchSchema>;

export async function matchResume(resumeText: string, jobDescription: string): Promise<ResumeMatch> {
  const systemPrompt = `Compare the resume text below with the provided job description. Give a match percentage (0-100), list of missing keywords, and 3 tailored bullet points to improve the resume. Output only valid JSON.`;

  const result = await groqChat(systemPrompt, `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`);
  const parsed = JSON.parse(result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  return ResumeMatchSchema.parse(parsed);
}

export async function draftReply(template: string, candidateDetails: string, customInstructions?: string): Promise<string> {
  const systemPrompt = `You are an AI recruitment assistant. Draft a professional reply to this candidate using the provided template and details. Personalize it. Keep it concise and professional.${customInstructions ? `\n\nCustom Instructions: ${customInstructions}` : ""}`;

  return groqChat(systemPrompt, `Template:\n${template}\n\nCandidate Details:\n${candidateDetails}`);
}
