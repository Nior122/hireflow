import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Starting database purge...');
  
  try {
    // Delete dependent records first to respect foreign key constraints
    await prisma.interviewPractice.deleteMany({});
    console.log('Deleted InterviewPractice records');
    
    await prisma.interviewQuestion.deleteMany({});
    console.log('Deleted InterviewQuestion records');
    
    await prisma.interviewNote.deleteMany({});
    console.log('Deleted InterviewNote records');
    
    await prisma.interview.deleteMany({});
    console.log('Deleted Interview records');
    
    await prisma.discoveredJob.deleteMany({});
    console.log('Deleted DiscoveredJob records');
    
    await prisma.followUpAction.deleteMany({});
    console.log('Deleted FollowUpAction records');
    
    await prisma.careerReminder.deleteMany({});
    console.log('Deleted CareerReminder records');
    
    await prisma.recruiterContact.deleteMany({});
    console.log('Deleted RecruiterContact records');
    
    await prisma.aIUserMemory.deleteMany({});
    console.log('Deleted AIUserMemory records');
    
    // EmailMessage depends on JobApplication in some cases
    await prisma.emailMessage.deleteMany({});
    console.log('Deleted EmailMessage records');
    
    // Finally delete JobApplications
    await prisma.jobApplication.deleteMany({});
    console.log('Deleted JobApplication records');

    console.log('\n✅ Database purged successfully! Clean slate achieved.');
    console.log('✅ Kept Users and GmailTokens intact.');
  } catch (error) {
    console.error('Error during purge:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
