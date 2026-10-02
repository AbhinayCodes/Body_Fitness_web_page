-- Store the full validated workout prescription (ranges, intensity, priority, warm-up/cool-down,
-- validation findings) alongside the existing flat day/exercise rows used for back-compat.
ALTER TABLE "WorkoutPlan" ADD COLUMN "prescription" JSONB;
