-- Portion scaling: store how many recipe servings each scheduled meal represents so the
-- displayed calories/macros reflect the actual quantity (not a single recipe serving).
ALTER TABLE "DailyScheduleMeal" ADD COLUMN "servings" DECIMAL(4,2) NOT NULL DEFAULT 1;
