import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type RelationEdge } from './exercise-candidates';
import { selectExercises, type SelectionRequirement } from './exercise-selector';
import { exerciseConstraints, exerciseLibrary, exerciseRelations } from './exercise-library';
import type { CatalogExercise } from './workout-planner.types';

const constraintsBySlug = new Map<string, Array<{ constraintType: string; area: string | null; severity: string | null }>>();
for (const constraint of exerciseConstraints) {
  const list = constraintsBySlug.get(constraint.slug) ?? [];
  list.push({ constraintType: constraint.constraintType, area: constraint.area ?? null, severity: constraint.severity });
  constraintsBySlug.set(constraint.slug, list);
}
const catalog: CatalogExercise[] = exerciseLibrary.map((exercise) => ({ ...exercise, id: exercise.slug, constraints: constraintsBySlug.get(exercise.slug) ?? [] }));
const relations: RelationEdge[] = exerciseRelations.map((relation) => ({ from: relation.from, to: relation.to, relationType: relation.relationType }));
const bySlug = new Map(catalog.map((exercise) => [exercise.slug, exercise]));
const GYM_EQUIPMENT = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'];

function candidatesFor(partial: Partial<CandidateQuery>) {
  const query: CandidateQuery = { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM_EQUIPMENT, ...partial };
  return getExerciseCandidates(catalog, relations, query).candidates;
}
const FULL_BODY: SelectionRequirement = { requiredPatterns: ['squat', 'horizontal-push', 'horizontal-pull', 'hip-hinge', 'core', 'conditioning'], exerciseCount: 6 };

function assertBalanced(result: ReturnType<typeof selectExercises>, count: number) {
  expect(result.selected.length).toBe(count);
  const slugs = result.selected.map((exercise) => exercise.slug);
  expect(new Set(slugs).size).toBe(slugs.length); // no duplication
  for (const value of Object.values(result.patternCounts)) expect(value).toBeLessThanOrEqual(2); // movement balance
  for (const exercise of result.selected) expect(exercise.reasons.length).toBeGreaterThan(0); // explainable, no raw scores
}

describe('selectExercises — core behaviour across profiles', () => {
  const profiles: Array<{ name: string; query: Partial<CandidateQuery>; requirement?: SelectionRequirement }> = [
    { name: 'beginner / full gym', query: { trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM_EQUIPMENT } },
    { name: 'beginner / home (dumbbells)', query: { trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: ['Dumbbells'] } },
    { name: 'intermediate / full gym', query: { trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM_EQUIPMENT } },
    { name: 'muscle gain', query: { primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'INTERMEDIATE' } },
    { name: 'fat loss', query: { primaryGoal: 'Lose fat', richGoal: 'lose_fat', trainingExperience: 'INTERMEDIATE' } },
    { name: 'recomposition', query: { primaryGoal: 'Maintain fitness', richGoal: 'recomp', trainingExperience: 'INTERMEDIATE' } },
    { name: 'limited equipment (bands)', query: { trainingLocation: 'HOME', equipment: ['Resistance bands'] } },
    { name: 'physical limitations (knee)', query: { trainingExperience: 'INTERMEDIATE', health: { injuryAreas: ['knee'] } } },
  ];

  it.each(profiles)('produces a balanced, non-duplicated selection for $name', ({ query, requirement }) => {
    const requirementToUse = requirement ?? FULL_BODY;
    const result = selectExercises(candidatesFor(query), requirementToUse);
    assertBalanced(result, requirementToUse.exerciseCount);
  });

  it('is deterministic for identical input', () => {
    const candidates = candidatesFor({ trainingExperience: 'INTERMEDIATE' });
    expect(selectExercises(candidates, FULL_BODY)).toEqual(selectExercises(candidates, FULL_BODY));
  });

  it('produces different selections for materially different users', () => {
    const gym = selectExercises(candidatesFor({ trainingExperience: 'INTERMEDIATE' }), FULL_BODY);
    const home = selectExercises(candidatesFor({ trainingExperience: 'INTERMEDIATE', trainingLocation: 'HOME', equipment: ['Dumbbells'] }), FULL_BODY);
    expect(gym.selected.map((exercise) => exercise.slug)).not.toEqual(home.selected.map((exercise) => exercise.slug));
  });
});

describe('selectExercises — balance and anti-over-optimization', () => {
  it('covers the required movement patterns at a full gym', () => {
    const result = selectExercises(candidatesFor({ trainingExperience: 'INTERMEDIATE' }), FULL_BODY);
    expect(result.uncoveredPatterns).toEqual([]);
    const patterns = new Set(result.selected.map((exercise) => exercise.movementPattern));
    expect(patterns.size).toBeGreaterThanOrEqual(5);
  });

  it('does not let a chest lover fill the session with chest work', () => {
    const candidates = candidatesFor({ trainingExperience: 'INTERMEDIATE', preferences: { enjoyedPatterns: ['horizontal-push'] } });
    const result = selectExercises(candidates, FULL_BODY);
    const chestExercises = result.selected.filter((exercise) => exercise.movementPattern === 'horizontal-push');
    expect(chestExercises.length).toBeLessThanOrEqual(2);
    const primaryMuscleCounts = result.selected.reduce<Record<string, number>>((counts, exercise) => { const muscle = exercise.muscleGroups[0]; counts[muscle] = (counts[muscle] ?? 0) + 1; return counts; }, {});
    for (const value of Object.values(primaryMuscleCounts)) expect(value).toBeLessThanOrEqual(2); // muscle balance preserved
  });

  it('lets preferences influence which exercise fills a slot', () => {
    const neutral = selectExercises(candidatesFor({ trainingExperience: 'ADVANCED' }), FULL_BODY);
    const prefersBodyweight = selectExercises(candidatesFor({ trainingExperience: 'ADVANCED', preferences: { enjoyedTypes: ['bodyweight'] } }), FULL_BODY);
    expect(neutral.selected.map((exercise) => exercise.slug)).not.toEqual(prefersBodyweight.selected.map((exercise) => exercise.slug));
  });

  it('avoids stacking several near-identical movements', () => {
    const result = selectExercises(candidatesFor({ trainingExperience: 'INTERMEDIATE' }), { requiredPatterns: ['horizontal-push'], exerciseCount: 6 });
    expect(result.patternCounts['horizontal-push']).toBeLessThanOrEqual(2);
  });
});

describe('selectExercises — intelligent alternatives and muscle targeting', () => {
  it('covers a squat requirement via an alternative pattern when all squats are unavailable', () => {
    // Knee injury removes loaded squats and single-leg work; disliking the rest empties the squat
    // pattern, so coverage must come from an affinity alternative (knee-extension).
    const candidates = candidatesFor({ trainingExperience: 'INTERMEDIATE', health: { injuryAreas: ['knee'] }, preferences: { dislikedExerciseSlugs: ['bodyweight-squat', 'dumbbell-goblet-squat', 'barbell-back-squat', 'leg-press', 'front-squat'] } });
    const result = selectExercises(candidates, { requiredPatterns: ['squat'], exerciseCount: 1 });
    expect(result.uncoveredPatterns).toEqual([]);
    expect(result.selected).toHaveLength(1);
    expect(result.selected[0].movementPattern).not.toBe('squat');
  });

  it('honours explicit target muscle groups', () => {
    const result = selectExercises(candidatesFor({ trainingExperience: 'INTERMEDIATE' }), { requiredPatterns: ['squat', 'horizontal-push'], exerciseCount: 5, targetMuscleGroups: ['back', 'glutes'] });
    const muscles = new Set(result.selected.flatMap((exercise) => exercise.muscleGroups));
    expect(muscles.has('back')).toBe(true);
    expect(muscles.has('glutes')).toBe(true);
  });

  it('reports a pattern as uncovered when no candidate or alternative exists', () => {
    const bodyweightOnly = candidatesFor({ trainingLocation: 'OUTDOOR', equipment: [] });
    // No equipment -> no horizontal-pull candidate and no affinity alternative (vertical-pull needs a bar/bands).
    const result = selectExercises(bodyweightOnly, { requiredPatterns: ['horizontal-pull'], exerciseCount: 1 });
    expect(result.uncoveredPatterns).toEqual(['horizontal-pull']);
    expect(result.selected.every((exercise) => exercise.movementPattern !== 'horizontal-pull')).toBe(true);
  });
});
