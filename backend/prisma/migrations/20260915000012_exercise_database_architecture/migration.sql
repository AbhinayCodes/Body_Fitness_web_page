-- Phase 1: Exercise Database architecture.
-- Extend Exercise with structured categorization/safety-neutral metadata, and add
-- dedicated tables for exercise relationships and interpretable constraint metadata.

-- AlterTable: additive, safe defaults so existing rows remain valid.
ALTER TABLE "Exercise"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'resistance',
  ADD COLUMN "secondaryMuscleGroups" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "mechanics" TEXT,
  ADD COLUMN "laterality" TEXT,
  ADD COLUMN "equipmentAlternatives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "suitableExperience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable: structured exercise relationships (variations / alternatives).
CREATE TABLE "ExerciseRelation" (
  "id" UUID NOT NULL,
  "fromExerciseId" UUID NOT NULL,
  "toExerciseId" UUID NOT NULL,
  "relationType" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseRelation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExerciseRelation_fromExerciseId_toExerciseId_relationType_key" ON "ExerciseRelation"("fromExerciseId", "toExerciseId", "relationType");
CREATE INDEX "ExerciseRelation_toExerciseId_idx" ON "ExerciseRelation"("toExerciseId");

ALTER TABLE "ExerciseRelation" ADD CONSTRAINT "ExerciseRelation_fromExerciseId_fkey" FOREIGN KEY ("fromExerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseRelation" ADD CONSTRAINT "ExerciseRelation_toExerciseId_fkey" FOREIGN KEY ("toExerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: interpretable, non-diagnostic constraint/caution metadata.
CREATE TABLE "ExerciseConstraint" (
  "id" UUID NOT NULL,
  "exerciseId" UUID NOT NULL,
  "constraintType" TEXT NOT NULL,
  "area" TEXT,
  "severity" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExerciseConstraint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExerciseConstraint_exerciseId_idx" ON "ExerciseConstraint"("exerciseId");

ALTER TABLE "ExerciseConstraint" ADD CONSTRAINT "ExerciseConstraint_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
