// Phase 4 — Personalized Exercise Selection.
//
// Selects exercises from the Phase 3 candidate pool for a given training requirement using
// structured, explainable rules (not randomness). Pipeline:
//   requirement -> movement balance -> muscle balance -> preference/fill
// Candidates arrive already ranked by Phase 3 (priority desc); that ranking is used internally as
// the suitability order and is never exposed. Preferences influence which exercise fills a slot but
// cannot dominate the session: per-pattern and per-primary-muscle caps keep the program balanced
// and avoid duplicating essentially the same movement.

import type { ExerciseCandidate } from './exercise-candidates';

export interface SelectionRequirement {
  requiredPatterns: string[];
  exerciseCount: number;
  targetMuscleGroups?: string[];
  maxPerPattern?: number;
  maxPerPrimaryMuscle?: number;
}

export interface SelectedExercise {
  slug: string;
  name: string;
  movementPattern: string;
  category?: string;
  muscleGroups: string[];
  estimatedMinutes: number;
  reasons: string[];
  cautions: string[];
}

export interface SelectionResult {
  selected: SelectedExercise[];
  uncoveredPatterns: string[];
  patternCounts: Record<string, number>;
  muscleCounts: Record<string, number>;
}

// When a required pattern has no suitable candidate, cover its intent with a related pattern.
const PATTERN_AFFINITY: Record<string, string[]> = {
  'squat': ['single-leg', 'knee-extension'],
  'single-leg': ['squat', 'knee-extension'],
  'hip-hinge': ['hip-extension', 'knee-flexion'],
  'hip-extension': ['hip-hinge'],
  'horizontal-push': ['vertical-push'],
  'vertical-push': ['horizontal-push'],
  'horizontal-pull': ['vertical-pull'],
  'vertical-pull': ['horizontal-pull'],
  'conditioning': ['locomotion'],
  'core': ['anti-extension', 'anti-rotation', 'anti-lateral-flexion', 'trunk-flexion'],
};

const primaryMuscle = (candidate: ExerciseCandidate) => candidate.muscleGroups[0] ?? 'general';

export function selectExercises(candidates: ExerciseCandidate[], requirement: SelectionRequirement): SelectionResult {
  const count = requirement.exerciseCount;
  const maxPerPattern = requirement.maxPerPattern ?? 2;
  const maxPerMuscle = requirement.maxPerPrimaryMuscle ?? 2;
  const targets = requirement.targetMuscleGroups ?? [];

  const selected: SelectedExercise[] = [];
  const used = new Set<string>();
  const patternCounts: Record<string, number> = {};
  const muscleCounts: Record<string, number> = {};
  const coveredPatterns = new Set<string>();

  const place = (candidate: ExerciseCandidate, reason: string) => {
    selected.push({ slug: candidate.slug, name: candidate.name, movementPattern: candidate.movementPattern, category: candidate.category, muscleGroups: candidate.muscleGroups, estimatedMinutes: candidate.estimatedMinutes, reasons: [reason], cautions: candidate.cautions });
    used.add(candidate.slug);
    patternCounts[candidate.movementPattern] = (patternCounts[candidate.movementPattern] ?? 0) + 1;
    muscleCounts[primaryMuscle(candidate)] = (muscleCounts[primaryMuscle(candidate)] ?? 0) + 1;
  };
  const patternOpen = (candidate: ExerciseCandidate) => !used.has(candidate.slug) && (patternCounts[candidate.movementPattern] ?? 0) < maxPerPattern;
  const fullyOpen = (candidate: ExerciseCandidate) => patternOpen(candidate) && (muscleCounts[primaryMuscle(candidate)] ?? 0) < maxPerMuscle;

  // PHASE 1 — movement balance: cover each required pattern once (prioritised over muscle caps).
  for (const pattern of requirement.requiredPatterns) {
    if (selected.length >= count) break;
    const direct = candidates.find((candidate) => candidate.movementPattern === pattern && patternOpen(candidate));
    if (direct) { place(direct, `Covers the ${pattern.replace(/-/g, ' ')} movement pattern`); coveredPatterns.add(pattern); continue; }
    const altPattern = (PATTERN_AFFINITY[pattern] ?? []).find((alt) => candidates.some((candidate) => candidate.movementPattern === alt && patternOpen(candidate)));
    if (altPattern) {
      const alternative = candidates.find((candidate) => candidate.movementPattern === altPattern && patternOpen(candidate))!;
      place(alternative, `Covers the ${pattern.replace(/-/g, ' ')} pattern via a ${altPattern.replace(/-/g, ' ')} alternative`);
      coveredPatterns.add(pattern);
    }
  }

  // PHASE 2 — muscle balance: ensure target muscle groups are represented.
  for (const muscle of targets) {
    if (selected.length >= count) break;
    if (selected.some((exercise) => exercise.muscleGroups.includes(muscle))) continue;
    const pick = candidates.find((candidate) => candidate.muscleGroups.includes(muscle) && fullyOpen(candidate));
    if (pick) place(pick, `Adds the ${muscle} muscle group for balance`);
  }

  // PHASE 3 — preference/fill: remaining slots by suitability, respecting both caps so preferences
  // influence but never dominate the session.
  for (const candidate of candidates) {
    if (selected.length >= count) break;
    if (!fullyOpen(candidate)) continue;
    const preferred = candidate.reasons.some((reason) => reason.includes('preferred') || reason.includes('enjoy'));
    place(candidate, preferred ? 'Included to match your preferences while keeping the session balanced' : 'Rounds out a balanced session');
  }

  // Relaxation — if caps left the session short, fill remaining unique candidates.
  if (selected.length < count) {
    for (const candidate of candidates) {
      if (selected.length >= count) break;
      if (!used.has(candidate.slug)) place(candidate, 'Added to complete the session');
    }
  }

  const uncoveredPatterns = requirement.requiredPatterns.filter((pattern) => !coveredPatterns.has(pattern));
  return { selected, uncoveredPatterns, patternCounts, muscleCounts };
}
