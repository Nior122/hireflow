import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDbUser } from '@/lib/clerk';

/**
 * Diagnostic dump of the signed-in user's ingested mail. It reads private mailbox
 * content, so it is authenticated and disabled on production deployments.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const user = await requireDbUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const count = await prisma.emailMessage.count();
  const jobs = await prisma.discoveredJob.count();
  const emails = await prisma.emailMessage.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ count, jobs, emails });
}
