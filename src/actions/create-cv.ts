'use server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createOrGetUser } from '@/lib/clerk';
import { groqChatJson } from '@/lib/ai/groq';
import { analyzeAts, resumeToText } from '@/lib/resume/ats';

const inputSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.email(), role: z.string().trim().min(2).max(120), skills: z.string().max(2000), experience: z.string().max(6000), education: z.string().max(3000) });
const cvSchema = z.object({ title: z.string(), summary: z.string(), experience: z.array(z.object({ title: z.string(), description: z.string() })), education: z.array(z.object({ title: z.string(), description: z.string() })), skills: z.array(z.string()) });
export async function createFullCv(input: z.infer<typeof inputSchema>) {
  const user = await createOrGetUser();
  const data = inputSchema.parse(input);
  const result = await groqChatJson({ messages: [
    { role: 'system', content: 'Create a truthful ATS-friendly CV from the user facts only. Never invent qualifications, dates, metrics or employers. Return only JSON with title, summary, experience: [{title,description}], education: [{title,description}], skills: string[]. No HTML.' },
    { role: 'user', content: JSON.stringify(data) },
  ], temperature: 0.2, max_tokens: 1800 });
  if (!result.ok) throw new Error(result.error ?? 'AI is unavailable');
  let cv: z.infer<typeof cvSchema>;
  try { cv = cvSchema.parse(JSON.parse(result.content.replace(/^```(?:json)?|```$/gm, '').trim())); }
  catch { throw new Error('AI returned an invalid CV. Please try again.'); }
  const sections = [
    { type: 'EXPERIENCE' as const, title: 'Work Experience', order: 0, content: { items: cv.experience } },
    { type: 'EDUCATION' as const, title: 'Education', order: 1, content: { items: cv.education } },
    { type: 'SKILLS' as const, title: 'Skills', order: 2, content: { items: cv.skills.map(title => ({ title })) } },
  ];
  const summary = `${data.name} | ${data.email}\n${cv.summary}`;
  const atsScore = analyzeAts(resumeToText({ title: cv.title, summary, sections }), sections).overallScore;
  const resume = await prisma.resume.create({ data: { userId: user.id, name: `${data.name} - ${data.role}`, title: cv.title, summary, atsScore, sections: { create: sections } }, include: { sections: true, versions: true } });
  return { id: resume.id, atsScore };
}
