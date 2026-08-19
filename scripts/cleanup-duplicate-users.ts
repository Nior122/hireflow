import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { prisma } from '../src/lib/prisma';

async function main() {
  // The duplicate: two users with email chinecheremjoseph39@gmail.com
  // One has a GmailToken (cmsani3d3000004jow6cox5lj), one does not (cmrnxhq7u0000p89s3ifszclu)
  // We keep the one WITH the token, delete the one without.
  const ORPHAN_USER_ID = 'cmrnxhq7u0000p89s3ifszclu'; // no token, duplicate

  console.log(`Deleting orphan duplicate user: ${ORPHAN_USER_ID}`);
  
  try {
    await prisma.user.delete({ where: { id: ORPHAN_USER_ID } });
    console.log('✅ Orphan user deleted.');
  } catch (err: any) {
    console.log('Could not delete user (may have dependent records):', err.message);
  }

  // Show final state
  const users = await prisma.user.findMany({
    select: { id: true, clerkId: true, email: true, role: true }
  });
  console.log('\nFinal user table:');
  users.forEach(u => {
    console.log(`  id=${u.id}  email=${u.email}  clerkId=${u.clerkId}`);
  });

  const tokens = await prisma.gmailToken.findMany({
    select: { userId: true, expiryDate: true, lastSyncedAt: true }
  });
  console.log('\nFinal GmailToken table:');
  tokens.forEach(t => {
    const expired = t.expiryDate ? new Date(t.expiryDate) < new Date() : false;
    console.log(`  userId=${t.userId}  expired=${expired}  lastSync=${t.lastSyncedAt}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
