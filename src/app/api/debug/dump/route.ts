import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrGetUser } from '@/lib/clerk';

export async function GET() {
  const count = await prisma.emailMessage.count();
  const jobs = await prisma.discoveredJob.count();
  const emails = await prisma.emailMessage.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ count, jobs, emails });
}
