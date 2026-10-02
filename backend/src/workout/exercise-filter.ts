// Filtering Engine (Phase 3/6).
//
// Reduces the full catalog to the exercises a specific user may perform, based on location,
// equipment, experience, goal and status, plus conservative, non-diagnostic safety filtering.
// This module makes NO medical judgements: it interprets the structured constraint metadata
// seeded in Phase 1/2 and errs toward caution. It never claims an exercise is universally safe.

import type { CatalogExercise, WorkoutPlanningInput } from './workout-planner.types';

// Conditions that warrant medical clearance before structured training rather than an auto plan.
const CLEARANCE_CONDITIONS = ['heart', 'pregnancy'];
// Conditions for which we conservatively avoid high-impact work (still no diagnosis made).
const IMPACT_SENSITIVE_CONDITIONS = ['heart', 'blood_pressure'];

export interface SafetyEvaluation {
  verdict: 'ok' | 'restricted';
  avoidHighImpact: boolean;
  notices: string[];
}

export function evaluateSafety(health?: WorkoutPlanningInput['health']): SafetyEvaluation {
  const notices: string[] = [];
  let verdict: SafetyEvaluation['verdict'] = 'ok';
  let avoidHighImpact = false;
  const conditions = health?.conditions ?? [];
  if (health?.doctorExerciseRestriction) {
    verdict = 'restricted';
    notices.push('A doctor has restricted exercise. This plan is limited to gentle, low-impact movement pending medical clearance.');
  }
  if (conditions.some((condition) => CLEARANCE_CONDITIONS.includes(condition))) {
    verdict = 'restricted';
    notices.push('Reported health information may require medical clearance before structured training. Please consult a qualified professional.');
  }
  if (conditions.some((condition) => IMPACT_SENSITIVE_CONDITIONS.includes(condition))) {
    avoidHighImpact = true;
    if (verdict === 'ok') notices.push('High-impact movements have been avoided based on your reported health information.');
  }
  return { verdict, avoidHighImpact, notices };
}

export function difficultyTier(experience: WorkoutPlanningInput['trainingExperience'], deload?: boolean): string[] {
  const tiers = experience === 'BEGINNER' ? ['BEGINNER'] : experience === 'INTERMEDIATE' ? ['BEGINNER', 'INTERMEDIATE'] : ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  return deload ? tiers.filter((tier) => tier !== 'ADVANCED') : tiers;
}

function violatesSafety(exercise: CatalogExercise, input: WorkoutPlanningInput, safety: SafetyEvaluation): boolean {
  const constraints = exercise.constraints ?? [];
  if (safety.avoidHighImpact && constraints.some((constraint) => constraint.constraintType === 'impact')) return true;
  const injuries = input.health?.injuryAreas ?? [];
  if (injuries.length && constraints.some((constraint) => constraint.area !== null && injuries.includes(constraint.area) && (constraint.severity === 'moderate' || constraint.severity === 'high'))) return true;
  if (input.health?.mobilityLimitation === 'significant' && constraints.some((constraint) => (constraint.constraintType === 'technical-demand' && constraint.severity === 'high') || (constraint.constraintType === 'balance-demand' && (constraint.severity === 'moderate' || constraint.severity === 'high')))) return true;
  return false;
}

export function isEligible(exercise: CatalogExercise, input: WorkoutPlanningInput, safety: SafetyEvaluation): boolean {
  if ((exercise.status ?? 'active') !== 'active') return false;
  if (!difficultyTier(input.trainingExperience, input.recovery?.deload).includes(exercise.difficulty)) return false;
  if (!exercise.locations.includes(input.trainingLocation)) return false;
  if (!exercise.equipment.every((item) => input.equipment.includes(item))) return false;
  if (!exercise.suitableGoals.includes(input.primaryGoal)) return false;
  if (input.preferences?.dislikedExerciseSlugs?.includes(exercise.slug)) return false;
  if (violatesSafety(exercise, input, safety)) return false;
  return true;
}

export function filterCatalog(catalog: CatalogExercise[], input: WorkoutPlanningInput, safety: SafetyEvaluation): CatalogExercise[] {
  return catalog.filter((exercise) => isEligible(exercise, input, safety));
}

// Gentle, low-impact movement used when a user needs medical clearance: mobility/cardio only,
// nothing with moderate/high demands and nothing high-impact.
export function gentleExercises(catalog: CatalogExercise[], input: { trainingLocation: string; equipment: string[] }): CatalogExercise[] {
  return catalog.filter((exercise) => {
    if ((exercise.status ?? 'active') !== 'active') return false;
    if (!exercise.locations.includes(input.trainingLocation)) return false;
    if (!exercise.equipment.every((item) => input.equipment.includes(item))) return false;
    if (exercise.category !== 'mobility' && exercise.category !== 'cardio') return false;
    const constraints = exercise.constraints ?? [];
    if (constraints.some((constraint) => constraint.constraintType === 'impact')) return false;
    if (constraints.some((constraint) => constraint.severity === 'moderate' || constraint.severity === 'high')) return false;
    return true;
  });
}
