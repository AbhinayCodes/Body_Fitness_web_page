// Selection Engine (Phase 4/6).
//
// Given an already-filtered (eligible) set of exercises, selects the exercises for a single
// session. It first guarantees coverage of the session's required movement patterns, then fills
// remaining slots. Preferences only influence ordering (tie-breaking/scoring) so they can shape
// selection without ever overriding the program's structural requirements. Selection is
// deterministic: equal scores break ties by slug.

import type { CatalogExercise, WorkoutPlanningInput } from './workout-planner.types';

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

export function scoreExercise(exercise: CatalogExercise, input: WorkoutPlanningInput): number {
  let score = 0;
  const preferences = input.preferences;
  if (preferences) {
    const tags = typeTags(exercise);
    for (const tag of tags) {
      if (preferences.enjoyedTypes?.includes(tag)) score += 2;
      if (preferences.dislikedTypes?.includes(tag)) score -= 3;
    }
    if (preferences.enjoyedPatterns?.includes(exercise.movementPattern)) score += 1;
    if (preferences.cardioPreference === 'minimal' && isCardio(exercise)) score -= 3;
    if (preferences.cardioPreference === 'love' && isCardio(exercise)) score += 2;
  }
  if (input.richGoal === 'strength' && exercise.mechanics === 'compound') score += 1;
  if ((input.richGoal === 'endurance' || input.richGoal === 'athletic') && isCardio(exercise)) score += 1;
  return score;
}

export function selectForDay(eligible: CatalogExercise[], requiredPatterns: string[], exerciseCount: number, input: WorkoutPlanningInput): CatalogExercise[] {
  const chosen: CatalogExercise[] = [];
  const used = new Set<string>();
  const byScore = (left: CatalogExercise, right: CatalogExercise) => scoreExercise(right, input) - scoreExercise(left, input) || left.slug.localeCompare(right.slug);

  for (const pattern of requiredPatterns) {
    if (chosen.length >= exerciseCount) break;
    const candidate = eligible.filter((exercise) => exercise.movementPattern === pattern && !used.has(exercise.id)).sort(byScore)[0];
    if (candidate) { chosen.push(candidate); used.add(candidate.id); }
  }
  for (const exercise of eligible.filter((item) => !used.has(item.id)).sort(byScore)) {
    if (chosen.length >= exerciseCount) break;
    chosen.push(exercise);
    used.add(exercise.id);
  }
  return chosen.slice(0, exerciseCount);
}
