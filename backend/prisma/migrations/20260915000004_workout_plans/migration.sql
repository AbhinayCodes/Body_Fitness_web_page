CREATE TYPE "ExerciseDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

CREATE TABLE "Exercise" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "muscleGroups" TEXT[] NOT NULL, "movementPattern" TEXT NOT NULL, "equipment" TEXT[] NOT NULL,
  "locations" TEXT[] NOT NULL, "difficulty" "ExerciseDifficulty" NOT NULL, "suitableGoals" TEXT[] NOT NULL,
  "contraindicationNotes" TEXT, "instructions" TEXT[] NOT NULL, "estimatedMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutPlan" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "sourceFingerprint" TEXT NOT NULL,
  "goal" TEXT NOT NULL, "experience" TEXT NOT NULL, "durationMinutes" INTEGER NOT NULL, "trainingLocation" TEXT NOT NULL,
  "trainingDays" TEXT[] NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutPlanDay" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workoutPlanId" UUID NOT NULL, "weekday" TEXT NOT NULL,
  "title" TEXT NOT NULL, "targetMuscleGroups" TEXT[] NOT NULL, "estimatedMinutes" INTEGER NOT NULL,
  CONSTRAINT "WorkoutPlanDay_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkoutPlanExercise" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "workoutPlanDayId" UUID NOT NULL, "exerciseId" UUID NOT NULL,
  "exerciseOrder" INTEGER NOT NULL, "sets" INTEGER NOT NULL, "reps" TEXT NOT NULL, "restSeconds" INTEGER NOT NULL,
  CONSTRAINT "WorkoutPlanExercise_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");
CREATE UNIQUE INDEX "WorkoutPlan_userId_sourceFingerprint_key" ON "WorkoutPlan"("userId", "sourceFingerprint");
CREATE INDEX "WorkoutPlan_userId_createdAt_idx" ON "WorkoutPlan"("userId", "createdAt");
CREATE UNIQUE INDEX "WorkoutPlanDay_workoutPlanId_weekday_key" ON "WorkoutPlanDay"("workoutPlanId", "weekday");
CREATE UNIQUE INDEX "WorkoutPlanExercise_workoutPlanDayId_exerciseOrder_key" ON "WorkoutPlanExercise"("workoutPlanDayId", "exerciseOrder");
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlanDay" ADD CONSTRAINT "WorkoutPlanDay_workoutPlanId_fkey" FOREIGN KEY ("workoutPlanId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_workoutPlanDayId_fkey" FOREIGN KEY ("workoutPlanDayId") REFERENCES "WorkoutPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlanExercise" ADD CONSTRAINT "WorkoutPlanExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;