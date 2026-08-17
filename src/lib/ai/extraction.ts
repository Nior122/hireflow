import { GroqProvider } from "@/lib/ai/providers";
import { z } from "zod";

// Schema for Job Extraction
export const JobExtractionSchema = z.object({
  company: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  remoteType: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  salaryCurrency: z.string().optional(),
  requirements: z.string().optional(),
  applicationUrl: z.string().optional(),
});

export type JobExtraction = z.infer<typeof JobExtractionSchema>;

export async function extractJobDetails(subject: string, snippet: string): Promise<JobExtraction | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `Extract structured job details from this email. Only output JSON matching the schema. No markdown, no text.
Email Subject: ${subject}
Email Snippet: ${snippet}

{
  "company": "string or null",
  "title": "job title or null",
  "location": "string or null",
  "employmentType": "FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, or null",
  "remoteType": "REMOTE, HYBRID, ONSITE, or null",
  "salaryMin": number or null,
  "salaryMax": number or null,
  "salaryCurrency": "USD, EUR, etc. or null",
  "requirements": "brief string or null",
  "applicationUrl": "url string or null"
}`;

  try {
    const provider = new GroqProvider();
    const response = await provider.chat([{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 512 });
    return JobExtractionSchema.parse(JSON.parse(response.trim()));
  } catch {
    return null;
  }
}

// Schema for Interview Extraction
export const InterviewExtractionSchema = z.object({
  date: z.string().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  meetingUrl: z.string().optional(),
  instructions: z.string().optional(),
});

export type InterviewExtraction = z.infer<typeof InterviewExtractionSchema>;

export async function extractInterviewDetails(subject: string, snippet: string): Promise<InterviewExtraction | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const prompt = `Extract interview details from this email. Only output JSON matching the schema.
Email Subject: ${subject}
Email Snippet: ${snippet}

{
  "date": "ISO-8601 date string or null",
  "timezone": "string or null",
  "location": "address/location or null",
  "meetingUrl": "zoom/meet url or null",
  "instructions": "brief instructions or null"
}`;

  try {
    const provider = new GroqProvider();
    const response = await provider.chat([{ role: "user", content: prompt }], { temperature: 0.1, maxTokens: 512 });
    return InterviewExtractionSchema.parse(JSON.parse(response.trim()));
  } catch {
    return null;
  }
}
