CREATE UNIQUE INDEX "ActivitySummary_userId_source_recordedAt_key" ON "ActivitySummary"("userId", "source", "recordedAt");

CREATE TABLE "ActivitySettings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "stepGoal" INTEGER NOT NULL DEFAULT 8000,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActivitySettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActivitySettings_userId_key" ON "ActivitySettings"("userId");
ALTER TABLE "ActivitySettings" ADD CONSTRAINT "ActivitySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;