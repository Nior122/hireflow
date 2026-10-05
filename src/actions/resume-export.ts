'use server';
import { exportResumeDocx, exportResumePdf, exportResumeText } from '@/lib/resume/export-files';
import { createOrGetUser } from '@/lib/clerk';
export async function exportResume(id: string, format: 'pdf' | 'docx' | 'txt') {
  const { prisma } = await import('@/lib/prisma');
  const user = await createOrGetUser();
  const resume = await prisma.resume.findFirst({ where: { id, userId: user.id }, include: { sections: true } });
  if (!resume) throw new Error('Resume not found');
  const text = exportResumeText({ title: resume.title, summary: resume.summary, sections: resume.sections });
  return (format === 'pdf' ? Buffer.from(exportResumePdf(text)) : format === 'docx' ? Buffer.from(exportResumeDocx(text)) : Buffer.from(text)).toString('base64');
}
