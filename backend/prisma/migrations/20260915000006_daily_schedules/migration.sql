CREATE TABLE "DailySchedule" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "date" DATE NOT NULL,
  "sourceFingerprint" TEXT NOT NULL, "isTrainingDay" BOOLEAN NOT NULL, "workoutPlanDayId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailySchedule_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DailyScheduleMeal" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "dailyScheduleId" UUID NOT NULL, "slot" TEXT NOT NULL,
  "scheduledMinutes" INTEGER NOT NULL, "targetCalories" INTEGER NOT NULL, "recipeId" UUID NOT NULL,
  "alternativeRecipeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "DailyScheduleMeal_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DailySchedule_userId_date_sourceFingerprint_key" ON "DailySchedule"("userId", "date", "sourceFingerprint");
CREATE INDEX "DailySchedule_userId_date_idx" ON "DailySchedule"("userId", "date");
CREATE UNIQUE INDEX "DailyScheduleMeal_dailyScheduleId_slot_key" ON "DailyScheduleMeal"("dailyScheduleId", "slot");
CREATE INDEX "DailyScheduleMeal_recipeId_idx" ON "DailyScheduleMeal"("recipeId");
ALTER TABLE "DailySchedule" ADD CONSTRAINT "DailySchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailySchedule" ADD CONSTRAINT "DailySchedule_workoutPlanDayId_fkey" FOREIGN KEY ("workoutPlanDayId") REFERENCES "WorkoutPlanDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyScheduleMeal" ADD CONSTRAINT "DailyScheduleMeal_dailyScheduleId_fkey" FOREIGN KEY ("dailyScheduleId") REFERENCES "DailySchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyScheduleMeal" ADD CONSTRAINT "DailyScheduleMeal_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;