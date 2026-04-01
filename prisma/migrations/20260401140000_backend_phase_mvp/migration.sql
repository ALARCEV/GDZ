CREATE TYPE "UserRole" AS ENUM ('PARENT', 'STUDENT', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DORMANT', 'BLOCKED');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "AttachmentKind" AS ENUM ('IMAGE', 'VOICE');
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
CREATE TYPE "ConsentType" AS ENUM ('PERSONAL_DATA_PROCESSING', 'MARKETING_MESSAGES');
CREATE TYPE "CaptureTrigger" AS ENUM ('SAVE_CHAT', 'OPEN_HISTORY', 'QUOTA_LIMIT', 'UNLOCK_MODALITY', 'PARENT_CHEATSHEET');
CREATE TYPE "CaptureStatus" AS ENUM ('SHOWN', 'STARTED', 'COMPLETED', 'DISMISSED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "role" "UserRole" NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "authProvider" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "studentAge" INTEGER,
  "isGuestConverted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestSession" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "fingerprintHash" TEXT,
  "utmSource" TEXT,
  "utmCampaign" TEXT,
  "locale" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "upgradedToUserId" TEXT,
  "upgradedAt" TIMESTAMP(3),
  CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChildProfile" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "parentId" TEXT NOT NULL,
  "grade" INTEGER NOT NULL,
  "firstName" TEXT,
  CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Chat" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT,
  "guestSessionId" TEXT,
  "childProfileId" TEXT,
  "grade" INTEGER,
  "subject" TEXT,
  "topic" TEXT,
  "title" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "role" "MessageRole" NOT NULL,
  "messageType" TEXT NOT NULL,
  "contentText" TEXT NOT NULL,
  "renderedMathHtml" TEXT,
  "tokenIn" INTEGER,
  "tokenOut" INTEGER,
  "costEstimate" DECIMAL(12,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL,
  "chatId" TEXT NOT NULL,
  "messageId" TEXT,
  "kind" "AttachmentKind" NOT NULL,
  "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
  "fileKey" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "durationSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "guestSessionId" TEXT,
  "chatId" TEXT,
  "eventType" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit" TEXT,
  "modelName" TEXT,
  "tokenIn" INTEGER,
  "tokenOut" INTEGER,
  "estimatedCost" DECIMAL(12,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotaPolicy" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "userSegment" TEXT NOT NULL,
  "dailyMessages" INTEGER,
  "dailyImages" INTEGER,
  "dailyVoiceMinutes" INTEGER,
  "monthlyMessages" INTEGER,
  "saveHistoryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "captureAfterValue" INTEGER NOT NULL DEFAULT 1,
  "softLimit" BOOLEAN NOT NULL DEFAULT true,
  "billingPlanCode" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "QuotaPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "guestSessionId" TEXT,
  "consentType" "ConsentType" NOT NULL,
  "accepted" BOOLEAN NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "userAgentHash" TEXT,
  "policyVersion" TEXT NOT NULL,
  CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaptureEvent" (
  "id" TEXT NOT NULL,
  "guestSessionId" TEXT NOT NULL,
  "registeredUserId" TEXT,
  "trigger" "CaptureTrigger" NOT NULL,
  "status" "CaptureStatus" NOT NULL,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaptureEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "GuestSession_expiresAt_idx" ON "GuestSession"("expiresAt");
CREATE INDEX "GuestSession_fingerprintHash_idx" ON "GuestSession"("fingerprintHash");
CREATE INDEX "GuestSession_lastSeenAt_idx" ON "GuestSession"("lastSeenAt");
CREATE UNIQUE INDEX "ChildProfile_parentId_key" ON "ChildProfile"("parentId");
CREATE INDEX "ChildProfile_grade_idx" ON "ChildProfile"("grade");
CREATE INDEX "Chat_ownerUserId_idx" ON "Chat"("ownerUserId");
CREATE INDEX "Chat_guestSessionId_idx" ON "Chat"("guestSessionId");
CREATE INDEX "Chat_childProfileId_idx" ON "Chat"("childProfileId");
CREATE INDEX "Chat_grade_subject_topic_idx" ON "Chat"("grade", "subject", "topic");
CREATE INDEX "Chat_updatedAt_idx" ON "Chat"("updatedAt");
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX "Message_role_idx" ON "Message"("role");
CREATE INDEX "Attachment_chatId_idx" ON "Attachment"("chatId");
CREATE INDEX "Attachment_messageId_idx" ON "Attachment"("messageId");
CREATE INDEX "Attachment_kind_status_idx" ON "Attachment"("kind", "status");
CREATE INDEX "UsageEvent_userId_idx" ON "UsageEvent"("userId");
CREATE INDEX "UsageEvent_guestSessionId_idx" ON "UsageEvent"("guestSessionId");
CREATE INDEX "UsageEvent_chatId_idx" ON "UsageEvent"("chatId");
CREATE INDEX "UsageEvent_eventType_createdAt_idx" ON "UsageEvent"("eventType", "createdAt");
CREATE UNIQUE INDEX "QuotaPolicy_name_key" ON "QuotaPolicy"("name");
CREATE INDEX "QuotaPolicy_userSegment_active_idx" ON "QuotaPolicy"("userSegment", "active");
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");
CREATE INDEX "ConsentLog_guestSessionId_idx" ON "ConsentLog"("guestSessionId");
CREATE INDEX "ConsentLog_consentType_acceptedAt_idx" ON "ConsentLog"("consentType", "acceptedAt");
CREATE INDEX "CaptureEvent_guestSessionId_createdAt_idx" ON "CaptureEvent"("guestSessionId", "createdAt");
CREATE INDEX "CaptureEvent_registeredUserId_idx" ON "CaptureEvent"("registeredUserId");
CREATE INDEX "CaptureEvent_trigger_status_idx" ON "CaptureEvent"("trigger", "status");

ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_upgradedToUserId_fkey" FOREIGN KEY ("upgradedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_owner_mode_check" CHECK (("ownerUserId" IS NOT NULL AND "guestSessionId" IS NULL) OR ("ownerUserId" IS NULL AND "guestSessionId" IS NOT NULL));
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_childProfileId_fkey" FOREIGN KEY ("childProfileId") REFERENCES "ChildProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CaptureEvent" ADD CONSTRAINT "CaptureEvent_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaptureEvent" ADD CONSTRAINT "CaptureEvent_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
