"use server";

import { createOrGetUser } from "@/lib/clerk";
import { prisma } from "@/lib/prisma";
import type { ActionResponse } from "@/lib/types";
import { GroqProvider } from "@/lib/ai/providers";
import { z } from "zod";

const EmailActionSchema = z.object({
  summary: z.string(),
  detectedCompany: z.string().optional(),
  detectedRole: z.string().optional(),
  detectedRecruiter: z.string().optional(),
  importantDates: z.array(z.string()).optional(),
  recommendedAction: z.enum(["EXTRACT_JOB", "ADD_TO_APPLICATIONS", "CREATE_REMINDER", "PREPARE_RESPONSE", "SCHEDULE_INTERVIEW", "NONE"])
});

export type EmailActionData = z.infer<typeof EmailActionSchema>;

export async function analyzeEmail(emailId: string): Promise<ActionResponse<EmailActionData>> {
  try {
    const user = await createOrGetUser();

    const email = await prisma.emailMessage.findFirst({
      where: { id: emailId, userId: user.id }
    });

    if (!email) {
      return { success: false, error: "Email not found" };
    }

    const provider = new GroqProvider();
    
    const systemPrompt = `You are an AI assistant helping a user manage their job search inbox.
    Analyze the following email and extract the requested information.
    Provide a concise summary.
    Identify the company, role, and recruiter name if present.
    Identify any important dates or deadlines (e.g. interview times, offer deadlines).
    Recommend ONE primary action the user should take: EXTRACT_JOB, ADD_TO_APPLICATIONS, CREATE_REMINDER, PREPARE_RESPONSE, SCHEDULE_INTERVIEW, or NONE.
    Respond ONLY with valid JSON matching this schema: { "summary": string, "detectedCompany"?: string, "detectedRole"?: string, "detectedRecruiter"?: string, "importantDates"?: string[], "recommendedAction": string }`;

    const text = `Subject: ${email.subject}\nFrom: ${email.sender} <${email.senderEmail}>\n\nBody:\n${email.snippet}`;

    const raw = await provider.chat([
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ], { temperature: 0.1, maxTokens: 512 });

    let analysis: EmailActionData;
    try {
      const parsed = JSON.parse(raw.trim());
      analysis = EmailActionSchema.parse(parsed);
    } catch {
      return { success: false, error: "Failed to analyze email" };
    }

    return { success: true, data: analysis };
  } catch (error) {
    console.error("[email-actions] analyzeEmail error:", error);
    return { success: false, error: "An error occurred while analyzing the email" };
  }
}
