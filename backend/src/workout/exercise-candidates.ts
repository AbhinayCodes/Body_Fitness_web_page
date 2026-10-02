// Phase 3 — Exercise Filtering & Safety/Constraint Engine.
//
// Takes a user's profile/context and returns a structured pool of candidate exercises with the
// reasons they were included, caution/modification flags, and why others were excluded. It does
// NOT build a workout. The pipeline runs conservatively in this order:
//   status -> health/safety -> equipment -> experience -> goal (soft) -> preference
// Health/safety filtering never diagnoses: it only interprets the structured constraint metadata
// seeded in Phases 1-2 and preserves a medical-clearance pathway for significant restrictions.

import type { CatalogExercise, HealthContext, RichGoal, WorkoutPreferences } from './workout-planner.types';
import { difficultyTier, evaluateSafety, gentleExercises } from './exercise-filter';

export interface CandidateQuery {
  primaryGoal: 'Build muscle' | 'Lose fat' | 'Maintain fitness';
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  trainingLocation: 'HOME' | 'GYM' | 'OUTDOOR' | 'MIXED';
  equipment: string[];
  richGoal?: RichGoal;
  preferences?: WorkoutPreferences;
  health?: HealthContext;
  recovery?: { deload?: boolean };
  history?: string[]; // slugs the user has performed before
}

export type FilterStage = 'status' | 'health-safety' | 'equipment' | 'experience' | 'goal' | 'preference';
export type CandidateStatus = 'eligible' | 'caution';
export interface RelationEdge { from: string; to: string; relationType: string }

export interface ExerciseCandidate {
  slug: string;
  name: string;
  movementPattern: string;
  category?: string;
  muscleGroups: string[];
  status: CandidateStatus;
  priority: number;
  reasons: string[];
  cautions: string[];
  suggestedAlternatives: string[];
  estimatedMinutes: number;
}

export interface ExcludedCandidate { slug: string; name: string; stage: FilterStage; reason: string; suggestedAlternatives: string[] }

export interface CandidateResult {
  requiresMedicalClearance: boolean;
  safetyNotices: string[];
  candidates: ExerciseCandidate[];
  excluded: ExcludedCandidate[];
  stageExclusionCounts: Record<FilterStage, number>;
}

const RELATION_PRIORITY: Record<string, number> = { 'alternative-same-pattern': 0, 'alternative-different-equipment': 1, 'easier': 2, 'alternative-similar-emphasis': 3, 'variation': 4, 'harder': 5 };

function isCardio(exercise: CatalogExercise): boolean {
  return exercise.category === 'cardio' || exercise.category === 'conditioning' || exercise.movementPattern === 'conditioning';
}
function typeTags(exercise: CatalogExercise): string[] {
  const tags: string[] = [];
  if (exercise.category === 'resistance') tags.push('strength');
  if (isCardio(exercise)) tags.push('cardio');
  if (exercise.category === 'mobility') tags.push('mobility');
  if (exercise.category === 'core') tags.push('core');
  if ((exercise.equipment?.length ?? 0) === 0) tags.push('bodyweight');
  return tags;
}

function alternativesFor(slug: string, relations: RelationEdge[], eligible: Set<string>): string[] {
  return relations
    .filter((relation) => relation.from === slug && relation.to !== slug && eligible.has(relation.to))
    .sort((left, right) => (RELATION_PRIORITY[left.relationType] ?? 9) - (RELATION_PRIORITY[right.relationType] ?? 9) || left.to.localeCompare(right.to))
    .map((relation) => relation.to)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 3);
}

type Evaluation = { excluded: true; stage: FilterStage; reason: string } | { excluded: false; candidate: ExerciseCandidate };
const exclude = (stage: FilterStage, reason: string): Evaluation => ({ excluded: true, stage, reason });

function evaluateExercise(exercise: CatalogExercise, query: CandidateQuery, safety: ReturnType<typeof evaluateSafety>, tiers: string[]): Evaluation {
  const reasons: string[] = [];
  const cautions: string[] = [];
  const constraints = exercise.constraints ?? [];

  // HEALTH / SAFETY (conservative; interprets constraint metadata only)
  if (safety.avoidHighImpact && constraints.some((constraint) => constraint.constraintType === 'impact')) return exclude('health-safety', 'High-impact movement avoided based on your reported health information.');
  const injuries = query.health?.injuryAreas ?? [];
  for (const constraint of constraints) {
    if (constraint.area && injuries.includes(constraint.area)) {
      if (constraint.severity === 'moderate' || constraint.severity === 'high') return exclude('health-safety', `Involves ${constraint.severity} ${constraint.area} load, which conflicts with your reported ${constraint.area} issue.`);
      cautions.push(`Involves light ${constraint.area} load — reduce range or load and stop if uncomfortable.`);
    }
  }
  if (query.health?.mobilityLimitation === 'significant') {
    if (constraints.some((constraint) => constraint.constraintType === 'technical-demand' && constraint.severity === 'high')) return exclude('health-safety', 'High technical demand excluded given a significant mobility limitation.');
    if (constraints.some((constraint) => constraint.constraintType === 'balance-demand' && (constraint.severity === 'moderate' || constraint.severity === 'high'))) return exclude('health-safety', 'Notable balance demand excluded given a significant mobility limitation.');
  } else if (query.health?.mobilityLimitation === 'some') {
    if (constraints.some((constraint) => constraint.constraintType === 'technical-demand' && constraint.severity === 'high')) cautions.push('High technical demand — consider a simpler variation.');
    if (constraints.some((constraint) => constraint.constraintType === 'balance-demand' && (constraint.severity === 'moderate' || constraint.severity === 'high'))) cautions.push('Balance demand — use support if needed.');
  }

  // EQUIPMENT (accurate; never inferred from location)
  const missing = exercise.equipment.filter((item) => !query.equipment.includes(item));
  if (missing.length) return exclude('equipment', `Requires ${missing.join(', ')}, which isn't in your available equipment.`);
  if (!exercise.locations.includes(query.trainingLocation)) return exclude('equipment', `Not set up for ${query.trainingLocation.toLowerCase()} training.`);
  reasons.push(exercise.equipment.length === 0 ? 'Needs no equipment.' : `Uses your ${exercise.equipment.join(', ')}.`);

  // EXPERIENCE
  if (!tiers.includes(exercise.difficulty)) return exclude('experience', query.recovery?.deload ? `Rated ${exercise.difficulty}; held back while easing back in.` : `Rated ${exercise.difficulty}; above your current training level.`);

  // GOAL (soft — influences priority, does not eliminate useful exercises)
  const goalMatch = exercise.suitableGoals.includes(query.primaryGoal);
  if (goalMatch) reasons.push(`Supports your goal to ${query.primaryGoal.toLowerCase()}.`);
  else cautions.push('Secondary for your current goal.');

  // PREFERENCE (influences priority; disliked specifics excluded, but types never override requirements)
  const preferences = query.preferences;
  if (preferences?.dislikedExerciseSlugs?.includes(exercise.slug)) return exclude('preference', 'You marked this exercise as disliked.');
  let priority = goalMatch ? 2 : 0;
  const tags = typeTags(exercise);
  if (preferences) {
    for (const tag of tags) {
      if (preferences.enjoyedTypes?.includes(tag)) { priority += 2; reasons.push(`Matches your preferred ${tag} training.`); }
      if (preferences.dislikedTypes?.includes(tag)) { priority -= 3; cautions.push(`Lower priority: you dislike ${tag} work.`); }
    }
    if (preferences.enjoyedPatterns?.includes(exercise.movementPattern)) { priority += 1; reasons.push('Targets a movement pattern you enjoy.'); }
    if (preferences.cardioPreference === 'minimal' && isCardio(exercise)) { priority -= 3; cautions.push('Minimised to match your cardio preference.'); }
    if (preferences.cardioPreference === 'love' && isCardio(exercise)) priority += 2;
  }
  if (query.richGoal === 'strength' && exercise.mechanics === 'compound') priority += 1;
  if ((query.richGoal === 'endurance' || query.richGoal === 'athletic') && isCardio(exercise)) priority += 1;
  if (query.history?.includes(exercise.slug)) { priority += 1; reasons.push('You have performed this before.'); }
  priority -= cautions.length;

  return { excluded: false, candidate: { slug: exercise.slug, name: exercise.name, movementPattern: exercise.movementPattern, category: exercise.category, muscleGroups: exercise.muscleGroups, status: cautions.length ? 'caution' : 'eligible', priority, reasons, cautions, suggestedAlternatives: [], estimatedMinutes: exercise.estimatedMinutes } };
}

function emptyStageCounts(): Record<FilterStage, number> {
  return { status: 0, 'health-safety': 0, equipment: 0, experience: 0, goal: 0, preference: 0 };
}

export function getExerciseCandidates(exercises: CatalogExercise[], relations: RelationEdge[], query: CandidateQuery): CandidateResult {
  const safety = evaluateSafety(query.health);
  const active = exercises.filter((exercise) => (exercise.status ?? 'active') === 'active');
  const excluded: ExcludedCandidate[] = exercises
    .filter((exercise) => (exercise.status ?? 'active') !== 'active')
    .map((exercise) => ({ slug: exercise.slug, name: exercise.name, stage: 'status' as const, reason: 'This exercise is not currently available.', suggestedAlternatives: [] }));

  // Significant restriction: preserve a medical-clearance pathway instead of a normal pool.
  if (safety.verdict === 'restricted') {
    const gentle = gentleExercises(active, query);
    const gentleSet = new Set(gentle.map((exercise) => exercise.slug));
    const candidates = gentle.map((exercise) => ({ slug: exercise.slug, name: exercise.name, movementPattern: exercise.movementPattern, category: exercise.category, muscleGroups: exercise.muscleGroups, status: 'caution' as const, priority: 0, reasons: ['Gentle movement that is appropriate while awaiting medical clearance.'], cautions: ['Confirm with a qualified professional before progressing.'], suggestedAlternatives: [], estimatedMinutes: exercise.estimatedMinutes }));
    for (const exercise of active) if (!gentleSet.has(exercise.slug)) excluded.push({ slug: exercise.slug, name: exercise.name, stage: 'health-safety', reason: 'Requires medical clearance before structured training.', suggestedAlternatives: [] });
    return { requiresMedicalClearance: true, safetyNotices: safety.notices, candidates: candidates.sort((left, right) => left.slug.localeCompare(right.slug)), excluded, stageExclusionCounts: countStages(excluded) };
  }

  const tiers = difficultyTier(query.trainingExperience, query.recovery?.deload);
  const candidates: ExerciseCandidate[] = [];
  for (const exercise of active) {
    const evaluation = evaluateExercise(exercise, query, safety, tiers);
    if (evaluation.excluded) excluded.push({ slug: exercise.slug, name: exercise.name, stage: evaluation.stage, reason: evaluation.reason, suggestedAlternatives: [] });
    else candidates.push(evaluation.candidate);
  }

  // Suggest meaningful alternatives (from structured relations) that are themselves eligible.
  const eligibleSet = new Set(candidates.map((candidate) => candidate.slug));
  for (const item of excluded) if (item.stage !== 'status') item.suggestedAlternatives = alternativesFor(item.slug, relations, eligibleSet);
  for (const candidate of candidates) if (candidate.status === 'caution') candidate.suggestedAlternatives = alternativesFor(candidate.slug, relations, eligibleSet);

  candidates.sort((left, right) => right.priority - left.priority || left.slug.localeCompare(right.slug));
  return { requiresMedicalClearance: false, safetyNotices: safety.notices, candidates, excluded, stageExclusionCounts: countStages(excluded) };
}

function countStages(excluded: ExcludedCandidate[]): Record<FilterStage, number> {
  const counts = emptyStageCounts();
  for (const item of excluded) counts[item.stage] += 1;
  return counts;
}
