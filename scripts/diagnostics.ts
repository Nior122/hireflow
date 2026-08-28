import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      gmailToken: true
    }
  });
  
  if (users.length === 0) {
    console.log("No users found");
    return;
  }
  
  const user = users[0];
  console.log(`User: ${user.email} (${user.id})`);
  
  const emailCount = await prisma.emailMessage.count({ where: { userId: user.id } });
  const noCategoryCount = await prisma.emailMessage.count({ where: { userId: user.id, category: null } });
  const otherCount = await prisma.emailMessage.count({ where: { userId: user.id, category: "OTHER" } });
  const jobRelatedCount = await prisma.emailMessage.count({ where: { userId: user.id, jobRelated: true } });
  const emptyBodyCount = await prisma.emailMessage.count({ where: { userId: user.id, body: null } });
  
  const jobAppCount = await prisma.jobApplication.count({ where: { userId: user.id } });
  const discoveredJobCount = await prisma.discoveredJob.count({ where: { userId: user.id } });
  const interviewCount = await prisma.interview.count({ where: { userId: user.id } });
  const recruiterCount = await prisma.recruiterContact.count({ where: { userId: user.id } });
  
  console.log("\nCounts:");
  console.log(`EmailMessage Total: ${emailCount}`);
  console.log(`EmailMessage Category=NULL: ${noCategoryCount}`);
  console.log(`EmailMessage Category=OTHER: ${otherCount}`);
  console.log(`EmailMessage jobRelated=true: ${jobRelatedCount}`);
  console.log(`EmailMessage Body=NULL: ${emptyBodyCount}`);
  
  console.log(`JobApplication Total: ${jobAppCount}`);
  console.log(`DiscoveredJob Total: ${discoveredJobCount}`);
  console.log(`Interview Total: ${interviewCount}`);
  console.log(`RecruiterContact Total: ${recruiterCount}`);
  
  const emails = await prisma.emailMessage.findMany({
    where: { userId: user.id },
    take: 10,
    orderBy: { createdAt: "desc" },
    select: { id: true, gmailMessageId: true, subject: true, sender: true, category: true, createdAt: true }
  });
  
  console.log("\n10 Recent Emails:");
  console.table(emails);
  
}

main().then(() => prisma.$disconnect()).catch(console.error);
