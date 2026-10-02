-- Store the full dynamic onboarding responses and schema version alongside the derived legacy fields.
ALTER TABLE "Onboarding" ADD COLUMN "responses" JSONB;
ALTER TABLE "Onboarding" ADD COLUMN "schemaVersion" INTEGER;
