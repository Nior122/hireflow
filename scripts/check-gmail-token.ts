import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- GmailToken table ---');
  const tokens = await prisma.gmailToken.findMany({
    select: {
      id: true,
      userId: true,
      accessToken: true,
      refreshToken: true,
      expiryDate: true,
      lastSyncedAt: true,
    }
  });

  if (tokens.length === 0) {
    console.log('❌ NO GmailTokens found in the database!');
    console.log('   Gmail has never been connected, OR the token was deleted.');
  } else {
    console.log(`✅ Found ${tokens.length} GmailToken(s):`);
    tokens.forEach((t, i) => {
      const expired = t.expiryDate ? new Date(t.expiryDate) < new Date() : false;
      console.log(`\n  Token #${i + 1}:`);
      console.log(`    id:           ${t.id}`);
      console.log(`    userId:       ${t.userId}`);
      console.log(`    accessToken:  ${t.accessToken ? t.accessToken.slice(0, 20) + '...' : 'NULL ⚠️'}`);
      console.log(`    refreshToken: ${t.refreshToken ? t.refreshToken.slice(0, 20) + '...' : 'NULL ⚠️'}`);
      console.log(`    expiryDate:   ${t.expiryDate ?? 'NULL'} ${expired ? '⚠️  EXPIRED' : '✅ valid'}`);
      console.log(`    lastSyncedAt: ${t.lastSyncedAt ?? 'Never'}`);
    });
  }

  console.log('\n--- User table ---');
  const users = await prisma.user.findMany({
    select: { id: true, clerkId: true, email: true, role: true }
  });
  console.log(`Found ${users.length} user(s):`);
  users.forEach(u => {
    console.log(`  id=${u.id}  clerkId=${u.clerkId}  email=${u.email}  role=${u.role}`);
  });

  console.log('\n--- Cross-check ---');
  for (const u of users) {
    const token = tokens.find(t => t.userId === u.id);
    if (token) {
      console.log(`  ✅ User ${u.email} HAS a GmailToken`);
    } else {
      console.log(`  ❌ User ${u.email} has NO GmailToken — this is why sync fails!`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
