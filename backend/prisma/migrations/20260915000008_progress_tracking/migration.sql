CREATE TABLE "ProgressSettings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "checkInFrequencyDays" INTEGER NOT NULL DEFAULT 7,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgressSettings_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProgressCheckIn" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "recordedAt" DATE NOT NULL, "weightKg" DECIMAL(5,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgressCheckIn_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BodyMeasurement" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "progressCheckInId" UUID NOT NULL, "type" TEXT NOT NULL, "valueCm" DECIMAL(5,2) NOT NULL,
  CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExercisePerformance" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "exerciseId" UUID NOT NULL, "recordedAt" DATE NOT NULL,
  "sets" INTEGER NOT NULL, "reps" INTEGER NOT NULL, "weightKg" DECIMAL(6,2), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExercisePerformance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProgressSettings_userId_key" ON "ProgressSettings"("userId");
CREATE UNIQUE INDEX "ProgressCheckIn_userId_recordedAt_key" ON "ProgressCheckIn"("userId", "recordedAt");
CREATE INDEX "ProgressCheckIn_userId_recordedAt_idx" ON "ProgressCheckIn"("userId", "recordedAt");
CREATE UNIQUE INDEX "BodyMeasurement_progressCheckInId_type_key" ON "BodyMeasurement"("progressCheckInId", "type");
CREATE INDEX "ExercisePerformance_userId_exerciseId_recordedAt_idx" ON "ExercisePerformance"("userId", "exerciseId", "recordedAt");
ALTER TABLE "ProgressSettings" ADD CONSTRAINT "ProgressSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgressCheckIn" ADD CONSTRAINT "ProgressCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_progressCheckInId_fkey" FOREIGN KEY ("progressCheckInId") REFERENCES "ProgressCheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExercisePerformance" ADD CONSTRAINT "ExercisePerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExercisePerformance" ADD CONSTRAINT "ExercisePerformance_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;