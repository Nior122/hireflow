import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.PG_PORT || 54329);
const HOST = process.env.PG_HOST || "127.0.0.1";

const sql = `
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  "clerkId" TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'JOB_SEEKER',
  email TEXT,
  "companyName" TEXT,
  "notificationPrefs" JSONB,
  "dashboardWidgets" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Organization" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo TEXT,
  website TEXT,
  industry TEXT,
  "companySize" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  "stripeCustomerId" TEXT,
  "stripeSubId" TEXT,
  plan TEXT NOT NULL DEFAULT 'FREE',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  seats INTEGER NOT NULL DEFAULT 1,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ApiKey" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT 'read',
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "Webhook" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  id TEXT PRIMARY KEY,
  "webhookId" TEXT NOT NULL REFERENCES "Webhook"(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  "responseCode" INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "UsageRecord" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  date TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS "FeatureFlag" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rules JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OrganizationSetting" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL UNIQUE REFERENCES "Organization"(id) ON DELETE CASCADE,
  "brandColor" TEXT,
  "logoUrl" TEXT,
  "emailBranding" JSONB,
  "securityPolicy" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OrganizationMember" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  "invitedById" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("organizationId", "userId")
);

CREATE TABLE IF NOT EXISTS "OrganizationInvitation" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  token TEXT NOT NULL UNIQUE,
  "invitedById" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "JobPosting" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  "employmentType" TEXT,
  location TEXT,
  "salaryMin" INTEGER,
  "salaryMax" INTEGER,
  "salaryCurrency" TEXT,
  description TEXT,
  requirements TEXT,
  benefits TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  "hiringManagerId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "JobApplication" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  link TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'UNAPPLIED',
  source TEXT,
  "sourceEmailId" TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contactName" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "contactLinkedin" TEXT,
  "resumeFileName" TEXT,
  "coverLetterFileName" TEXT,
  "otherDocuments" JSONB
);

CREATE TABLE IF NOT EXISTS "Reminder" (
  id TEXT PRIMARY KEY,
  "applicationId" TEXT NOT NULL REFERENCES "JobApplication"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  id TEXT PRIMARY KEY,
  "applicationId" TEXT REFERENCES "JobApplication"(id) ON DELETE SET NULL,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Candidate" (
  id TEXT PRIMARY KEY,
  "employerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  "positionApplied" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  "resumeText" TEXT,
  "coverLetter" TEXT,
  "keySkills" TEXT[] NOT NULL DEFAULT '{}',
  "experienceSummary" TEXT,
  "sourceEmailId" TEXT,
  "emailBody" TEXT,
  rating INTEGER,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "jobPostingId" TEXT REFERENCES "JobPosting"(id) ON DELETE SET NULL,
  "recruiterId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "hiringManagerId" TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "TeamComment" (
  id TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL REFERENCES "Candidate"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CandidateScorecard" (
  id TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL REFERENCES "Candidate"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "technicalScore" INTEGER,
  "communicationScore" INTEGER,
  "problemSolvingScore" INTEGER,
  "leadershipScore" INTEGER,
  "cultureFitScore" INTEGER,
  "overallScore" INTEGER,
  recommendation TEXT,
  notes TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  "entityId" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Resume" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "atsScore" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "jobApplicationId" TEXT REFERENCES "JobApplication"(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS "ResumeSection" (
  id TEXT PRIMARY KEY,
  "resumeId" TEXT NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ResumeVersion" (
  id TEXT PRIMARY KEY,
  "resumeId" TEXT NOT NULL REFERENCES "Resume"(id) ON DELETE CASCADE,
  "versionNumber" INTEGER NOT NULL,
  notes TEXT,
  snapshot JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CoverLetter" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "resumeId" TEXT REFERENCES "Resume"(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Conversation" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "roleContext" TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ConversationMessage" (
  id TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "GmailToken" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "lastSyncedAt" TIMESTAMP(3),
  "historyId" TEXT
);

CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  id TEXT PRIMARY KEY,
  "employerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "autoSend" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AiReply" (
  id TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL REFERENCES "Candidate"(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CandidateActivity" (
  id TEXT PRIMARY KEY,
  "candidateId" TEXT NOT NULL REFERENCES "Candidate"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  detail TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CalendarConnection" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "SavedJob" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "externalId" TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  "remoteType" TEXT,
  "salaryMin" INTEGER,
  "salaryMax" INTEGER,
  "salaryCurrency" TEXT,
  description TEXT,
  requirements TEXT,
  skills JSONB,
  "companyLogo" TEXT,
  "companyWebsite" TEXT,
  "applicationUrl" TEXT,
  "postedAt" TIMESTAMP(3),
  "importedToKanban" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "externalId", source)
);

CREATE TABLE IF NOT EXISTS "Interview" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "applicationId" TEXT REFERENCES "JobApplication"(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  "interviewType" TEXT NOT NULL DEFAULT 'TECHNICAL',
  "interviewRound" INTEGER NOT NULL DEFAULT 1,
  "scheduledAt" TIMESTAMP(3),
  duration INTEGER,
  location TEXT,
  "meetingLink" TEXT,
  "interviewerName" TEXT,
  "interviewerEmail" TEXT,
  timezone TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  "calendarEventId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InterviewPractice" (
  id TEXT PRIMARY KEY,
  "interviewId" TEXT REFERENCES "Interview"(id) ON DELETE SET NULL,
  "jobApplicationId" TEXT REFERENCES "JobApplication"(id) ON DELETE SET NULL,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  company TEXT,
  role TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question TEXT NOT NULL,
  "userAnswer" TEXT,
  "aiFeedback" JSONB,
  score INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InterviewQuestion" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  company TEXT,
  role TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question TEXT NOT NULL,
  "answerGuide" TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "InterviewNote" (
  id TEXT PRIMARY KEY,
  "interviewId" TEXT NOT NULL REFERENCES "Interview"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AIUserProfile" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  summary TEXT,
  "careerGoals" JSONB,
  "preferredRoles" TEXT[] NOT NULL DEFAULT '{}',
  "preferredLocations" TEXT[] NOT NULL DEFAULT '{}',
  "preferredWorkModes" TEXT[] NOT NULL DEFAULT '{}',
  skills TEXT[] NOT NULL DEFAULT '{}',
  "technicalSkills" TEXT[] NOT NULL DEFAULT '{}',
  "softSkills" TEXT[] NOT NULL DEFAULT '{}',
  education JSONB,
  certifications JSONB,
  experience JSONB,
  projects JSONB,
  achievements TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  "salaryExpectation" TEXT,
  industries TEXT[] NOT NULL DEFAULT '{}',
  "preferredCompanies" TEXT[] NOT NULL DEFAULT '{}',
  "yearsOfExperience" INTEGER,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  weaknesses TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EmailMessage" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "gmailMessageId" TEXT NOT NULL,
  "gmailThreadId" TEXT,
  sender TEXT,
  "senderEmail" TEXT,
  recipients TEXT,
  subject TEXT,
  snippet TEXT,
  body TEXT,
  "receivedAt" TIMESTAMP(3),
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "isStarred" BOOLEAN NOT NULL DEFAULT false,
  labels TEXT[] NOT NULL DEFAULT '{}',
  category TEXT,
  confidence DOUBLE PRECISION,
  "jobApplicationId" TEXT REFERENCES "JobApplication"(id) ON DELETE SET NULL,
  "jobRelated" BOOLEAN NOT NULL DEFAULT false,
  "applicationRelated" BOOLEAN NOT NULL DEFAULT false,
  "interviewRelated" BOOLEAN NOT NULL DEFAULT false,
  "rejectionRelated" BOOLEAN NOT NULL DEFAULT false,
  "offerRelated" BOOLEAN NOT NULL DEFAULT false,
  urgency DOUBLE PRECISION DEFAULT 0,
  importance DOUBLE PRECISION DEFAULT 0,
  action TEXT,
  "replyDraft" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "gmailMessageId")
);

CREATE TABLE IF NOT EXISTS "DiscoveredJob" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "sourceEmailId" TEXT REFERENCES "EmailMessage"(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  "employmentType" TEXT,
  "remoteType" TEXT,
  "salaryMin" INTEGER,
  "salaryMax" INTEGER,
  "salaryCurrency" TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AIUserMemory" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FollowUpAction" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "jobApplicationId" TEXT REFERENCES "JobApplication"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "dueDate" TIMESTAMP(3) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  "actionType" TEXT NOT NULL DEFAULT 'EMAIL',
  "sourceEmailId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "RecruiterContact" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  role TEXT,
  "linkedInUrl" TEXT,
  relationship TEXT,
  "lastContactedAt" TIMESTAMP(3),
  "communicationCount" INTEGER NOT NULL DEFAULT 0,
  "sourceEmailIds" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CareerReminder" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date TIMESTAMP(3) NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "sourceEmailId" TEXT,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  description TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "_InterviewerOnJobs" (
  "A" TEXT NOT NULL REFERENCES "JobPosting"(id) ON DELETE CASCADE,
  "B" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  UNIQUE ("A", "B")
);

INSERT INTO "User" (id, "clerkId", role, email)
VALUES ('demo-user-id', 'demo-local-user', 'JOB_SEEKER', 'demo@hireflow.local')
ON CONFLICT ("clerkId") DO NOTHING;
`;

const db = await PGlite.create();
await db.exec(sql);

const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: HOST,
});

await server.start();
console.log(`PGlite postgres listening on ${HOST}:${PORT}`);

process.on("SIGINT", async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await server.stop();
  await db.close();
  process.exit(0);
});
