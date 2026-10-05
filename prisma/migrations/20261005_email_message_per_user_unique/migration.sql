-- EmailMessage.gmailMessageId is unique per user, not globally.
DROP INDEX IF EXISTS "EmailMessage_gmailMessageId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "EmailMessage_userId_gmailMessageId_key" ON "EmailMessage"("userId", "gmailMessageId");
