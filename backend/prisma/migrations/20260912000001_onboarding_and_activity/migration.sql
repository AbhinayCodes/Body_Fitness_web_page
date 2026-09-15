CREATE TABLE "Onboarding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "age" INTEGER,
  "sex" TEXT,
  "heightCm" INTEGER,
  "weightKg" INTEGER,
  "primaryGoal" TEXT,
  "secondaryGoal" TEXT,
  "trainingExperience" TEXT,
  "trainingDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "workoutDurationMinutes" INTEGER,
  "trainingLocation" TEXT,
  "equipment" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dietType" TEXT,
  "foodPreferences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "foodRestrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "wakeTime" TEXT,
  "workSchedule" TEXT,
  "preferredGymTime" TEXT,
  "sleepTime" TEXT,
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Onboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivitySummary" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL,
  "steps" INTEGER,
  "distanceMeters" INTEGER,
  "activeCalories" INTEGER,
  "workoutDurationMinutes" INTEGER,
  "heartRateBpm" INTEGER,
  "sleepMinutes" INTEGER,
  "recoveryScore" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivitySummary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Onboarding_userId_key" ON "Onboarding"("userId");
CREATE INDEX "ActivitySummary_userId_recordedAt_idx" ON "ActivitySummary"("userId", "recordedAt");
CREATE INDEX "ActivitySummary_userId_source_recordedAt_idx" ON "ActivitySummary"("userId", "source", "recordedAt");
ALTER TABLE "Onboarding" ADD CONSTRAINT "Onboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivitySummary" ADD CONSTRAINT "ActivitySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;