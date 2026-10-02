// Shared mapping from the persisted onboarding record (legacy fields + dynamic `responses`) to the
// derived training context used by the workout engine. Centralised here so the planner and the
// exercise-candidate engine interpret a user's profile identically.

import type { HealthContext, RichGoal, WorkoutPreferences } from './workout-planner.types';

export interface DerivedContext {
  equipment: string[];
  richGoal?: RichGoal;
  preferences?: WorkoutPreferences;
  health?: HealthContext;
  recovery?: { deload?: boolean };
}

// Maps onboarding equipment vocabulary onto the exercise catalog's equipment vocabulary.
const EQUIPMENT_MAP: Record<string, string[]> = {
  'Dumbbells': ['Dumbbells'], 'Barbell': ['Barbell'], 'Resistance bands': ['Resistance bands'], 'Kettlebell': ['Kettlebell'],
  'Pull-up bar': ['Pull-up bar'], 'Bench': ['Bench'], 'Machines': ['Machines'], 'Cables': ['Cable'], 'Cable': ['Cable'],
  'Cardio machines': ['Cardio machine'], 'Cardio machine': ['Cardio machine'], 'Squat rack': ['Barbell'],
  'Free weights': ['Barbell', 'Dumbbells'], 'Everything': ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'],
};

export function normalizeEquipment(raw: string[]): string[] {
  return [...new Set(raw.flatMap((item) => EQUIPMENT_MAP[item] ?? []))];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

const TRAINING_TYPE_TAGS: Record<string, string> = { strength: 'strength', cardio: 'cardio', hiit: 'cardio', bodyweight: 'bodyweight', mobility: 'mobility' };

function preferencesFromResponses(responses: Record<string, unknown>): WorkoutPreferences | undefined {
  const enjoyedTypes = [...new Set(asStringArray(responses.preferredTrainingTypes).map((type) => TRAINING_TYPE_TAGS[type]).filter(Boolean))];
  const cardioPreference = typeof responses.cardioPreference === 'string' ? (responses.cardioPreference as WorkoutPreferences['cardioPreference']) : undefined;
  if (!enjoyedTypes.length && !cardioPreference) return undefined;
  return { ...(enjoyedTypes.length ? { enjoyedTypes } : {}), ...(cardioPreference ? { cardioPreference } : {}) };
}

const INJURY_AREA_MAP: Record<string, string> = { knee: 'knee', shoulder: 'shoulder', back: 'lower-back', neck: 'neck', hip: 'hip', ankle: 'ankle', wrist: 'wrist' };

function healthFromResponses(responses: Record<string, unknown>): HealthContext | undefined {
  const injuryAreas = [...new Set(asStringArray(responses.injuryAreas).map((area) => INJURY_AREA_MAP[area]).filter(Boolean))];
  const conditions = asStringArray(responses.healthConditions);
  const mobilityLimitation = typeof responses.mobilityLimitations === 'string' ? (responses.mobilityLimitations as HealthContext['mobilityLimitation']) : undefined;
  const doctorExerciseRestriction = responses.doctorExerciseRestrictions === 'yes';
  if (!injuryAreas.length && !conditions.length && !mobilityLimitation && !doctorExerciseRestriction) return undefined;
  return { ...(injuryAreas.length ? { injuryAreas } : {}), ...(conditions.length ? { conditions } : {}), ...(mobilityLimitation ? { mobilityLimitation } : {}), doctorExerciseRestriction };
}

function isDeload(responses: Record<string, unknown>): boolean {
  return responses.sleepDuration === 'lt6' || responses.trainingConsistency === 'none';
}

export function contextFromOnboarding(onboarding: { equipment: string[]; responses: unknown }): DerivedContext {
  const responses = (onboarding.responses ?? {}) as Record<string, unknown>;
  return {
    equipment: normalizeEquipment(onboarding.equipment),
    richGoal: typeof responses.primaryGoal === 'string' ? (responses.primaryGoal as RichGoal) : undefined,
    preferences: preferencesFromResponses(responses),
    health: healthFromResponses(responses),
    recovery: { deload: isDeload(responses) },
  };
}
