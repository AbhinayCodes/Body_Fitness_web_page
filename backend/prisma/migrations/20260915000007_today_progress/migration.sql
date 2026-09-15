ALTER TABLE "WorkoutSession" ADD COLUMN "workoutPlanDayId" UUID;
ALTER TABLE "ExerciseCompletion" ADD COLUMN "setsCompleted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DailyScheduleMeal" ADD COLUMN "eatenAt" TIMESTAMP(3);
CREATE INDEX "WorkoutSession_userId_workoutPlanDayId_date_idx" ON "WorkoutSession"("userId", "workoutPlanDayId", "date");
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_workoutPlanDayId_fkey" FOREIGN KEY ("workoutPlanDayId") REFERENCES "WorkoutPlanDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;