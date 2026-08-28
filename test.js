const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Emails:', await prisma.emailMessage.count());
  console.log('Jobs:', await prisma.discoveredJob.count());
  console.log('Apps:', await prisma.jobApplication.count());
}

run().finally(() => prisma.$disconnect());
