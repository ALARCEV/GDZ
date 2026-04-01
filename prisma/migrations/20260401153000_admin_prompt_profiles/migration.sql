CREATE TABLE "PromptProfile" (
  "id" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "gradeFrom" INTEGER NOT NULL,
  "gradeTo" INTEGER NOT NULL,
  "mode" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "parentOverlayPrompt" TEXT,
  "subjectOverridesJson" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PromptProfile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PromptProfile_active_idx" ON "PromptProfile"("active");
CREATE INDEX "PromptProfile_gradeFrom_gradeTo_idx" ON "PromptProfile"("gradeFrom", "gradeTo");
CREATE INDEX "PromptProfile_mode_idx" ON "PromptProfile"("mode");
