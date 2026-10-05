'use server';
import { prisma } from '@/lib/prisma';
import { createOrGetUser } from '@/lib/clerk';
import { getValidGmailToken } from '@/lib/gmail/tokens';
export async function getReviewDrafts() {
  const user = await createOrGetUser();
  return prisma.aiReply.findMany({ where: { status: 'DRAFT', candidate: { employerId: user.id } }, include: { candidate: { select: { name: true, email: true, positionApplied: true } } }, orderBy: { createdAt: 'desc' } });
}
export async function saveReviewDraft(id: string, body: string) {
  const user = await createOrGetUser();
  if (!body.trim() || body.length > 10000) throw new Error('Draft must be 1–10,000 characters');
  const result = await prisma.aiReply.updateMany({ where: { id, status: 'DRAFT', candidate: { employerId: user.id } }, data: { body: body.trim() } });
  if (!result.count) throw new Error('Draft not found');
}
export async function rejectReviewDraft(id: string) {
  const user = await createOrGetUser();
  await prisma.aiReply.updateMany({ where: { id, status: 'DRAFT', candidate: { employerId: user.id } }, data: { status: 'REJECTED' } });
}
export async function sendReviewDraft(id: string) {
  const user = await createOrGetUser();
  const reply = await prisma.aiReply.findFirst({ where: { id, status: 'DRAFT', candidate: { employerId: user.id } }, include: { candidate: true } });
  if (!reply) throw new Error('Draft not found');
  const token = await getValidGmailToken(user.id);
  if (!token) throw new Error('Connect Gmail with send permission before sending');
  const raw = Buffer.from(`To: ${reply.candidate.email}\r\nSubject: Your application for ${reply.candidate.positionApplied.replace(/[\r\n]/g, ' ')}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${reply.body}`).toString('base64url');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
  if (!response.ok) throw new Error('Gmail could not send this draft. It remains in review.');
  await prisma.aiReply.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } });
}
