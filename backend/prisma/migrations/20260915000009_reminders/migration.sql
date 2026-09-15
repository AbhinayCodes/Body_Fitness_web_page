CREATE TABLE "ReminderSettings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "workoutEnabled" BOOLEAN NOT NULL DEFAULT false, "mealEnabled" BOOLEAN NOT NULL DEFAULT false,
  "preWorkoutEnabled" BOOLEAN NOT NULL DEFAULT false, "postWorkoutEnabled" BOOLEAN NOT NULL DEFAULT false,
  "checkInEnabled" BOOLEAN NOT NULL DEFAULT false, "workoutLeadMinutes" INTEGER NOT NULL DEFAULT 30,
  "mealLeadMinutes" INTEGER NOT NULL DEFAULT 10, "checkInTime" TEXT NOT NULL DEFAULT '09:00',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReminderOccurrence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "kind" TEXT NOT NULL, "sourceKey" TEXT NOT NULL,
  "scheduledLocalDate" TEXT NOT NULL, "scheduledMinutes" INTEGER NOT NULL, "timezone" TEXT NOT NULL, "payload" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderOccurrence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReminderSettings_userId_key" ON "ReminderSettings"("userId");
CREATE UNIQUE INDEX "ReminderOccurrence_userId_kind_sourceKey_scheduledLocalDate_key" ON "ReminderOccurrence"("userId", "kind", "sourceKey", "scheduledLocalDate");
CREATE INDEX "ReminderOccurrence_userId_scheduledLocalDate_scheduledMinutes_idx" ON "ReminderOccurrence"("userId", "scheduledLocalDate", "scheduledMinutes");
ALTER TABLE "ReminderSettings" ADD CONSTRAINT "ReminderSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderOccurrence" ADD CONSTRAINT "ReminderOccurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;