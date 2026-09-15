ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

CREATE TABLE "OtpChallenge" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "phoneNumber" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" UUID,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OtpChallenge_phoneNumber_createdAt_idx" ON "OtpChallenge"("phoneNumber", "createdAt");
CREATE INDEX "OtpChallenge_phoneNumber_expiresAt_idx" ON "OtpChallenge"("phoneNumber", "expiresAt");
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;