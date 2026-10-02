import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type RelationEdge } from './exercise-candidates';
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

function query(partial: Partial<CandidateQuery>): CandidateQuery {
  return { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM_EQUIPMENT, ...partial };
}
const run = (partial: Partial<CandidateQuery>) => getExerciseCandidates(catalog, relations, query(partial));

describe('getExerciseCandidates — equipment filtering', () => {
  it('only offers exercises performable with a dumbbell-only home setup', () => {
    const result = run({ trainingLocation: 'HOME', equipment: ['Dumbbells'] });
    for (const candidate of result.candidates) {
      expect(bySlug.get(candidate.slug)!.equipment.every((item) => item === 'Dumbbells')).toBe(true);
    }
    const barbell = result.excluded.find((item) => item.slug === 'barbell-bench-press');
    expect(barbell?.stage).toBe('equipment');
    expect(barbell?.suggestedAlternatives.length).toBeGreaterThan(0); // meaningful alternative suggested
  });

  it('does not infer equipment from location — a gym user without machines gets no machine work', () => {
    const result = run({ trainingLocation: 'GYM', equipment: ['Barbell'] });
    expect(result.candidates.some((candidate) => bySlug.get(candidate.slug)!.equipment.includes('Machines'))).toBe(false);
    expect(result.excluded.some((item) => item.slug === 'lat-pulldown' && item.stage === 'equipment')).toBe(true);
  });
});

describe('getExerciseCandidates — experience filtering', () => {
  it('excludes advanced exercises for a beginner and admits them for an advanced user', () => {
    const beginner = run({ trainingExperience: 'BEGINNER' });
    expect(beginner.candidates.some((candidate) => candidate.slug === 'barbell-deadlift')).toBe(false);
    expect(beginner.excluded.some((item) => item.slug === 'barbell-deadlift' && item.stage === 'experience')).toBe(true);

    const advanced = run({ trainingExperience: 'ADVANCED' });
    expect(advanced.candidates.some((candidate) => candidate.slug === 'barbell-deadlift')).toBe(true);
  });

  it('holds back advanced exercises while deloading', () => {
    const result = run({ trainingExperience: 'ADVANCED', recovery: { deload: true } });
    expect(result.candidates.every((candidate) => bySlug.get(candidate.slug)!.difficulty !== 'ADVANCED')).toBe(true);
  });
});

describe('getExerciseCandidates — goal (soft) filtering', () => {
  it('does not eliminate useful off-goal exercises but flags them as secondary', () => {
    const result = run({ primaryGoal: 'Build muscle' });
    const conditioning = result.candidates.find((candidate) => candidate.slug === 'jumping-jacks');
    expect(conditioning).toBeDefined();
    expect(conditioning?.cautions).toContain('Secondary for your current goal.');
    expect(result.excluded.some((item) => item.slug === 'jumping-jacks')).toBe(false);
  });
});

describe('getExerciseCandidates — preference filtering', () => {
  it('excludes disliked specific exercises and suggests alternatives', () => {
    const result = run({ trainingExperience: 'ADVANCED', preferences: { dislikedExerciseSlugs: ['barbell-bench-press'] } });
    const disliked = result.excluded.find((item) => item.slug === 'barbell-bench-press');
    expect(disliked?.stage).toBe('preference');
    expect(disliked?.suggestedAlternatives.length).toBeGreaterThan(0);
  });

  it('lets preferred types raise priority without excluding anything', () => {
    const result = run({ trainingLocation: 'HOME', equipment: [], preferences: { enjoyedTypes: ['bodyweight'] } });
    const bodyweight = result.candidates.find((candidate) => candidate.slug === 'push-up');
    expect(bodyweight?.reasons).toContain('Matches your preferred bodyweight training.');
    // Preference ordering: candidates are returned highest-priority first.
    const priorities = result.candidates.map((candidate) => candidate.priority);
    expect([...priorities]).toEqual([...priorities].sort((a, b) => b - a));
  });

  it('does not let a disliked type override a fundamental requirement (still available, just lower priority)', () => {
    const result = run({ primaryGoal: 'Lose fat', preferences: { dislikedTypes: ['cardio'] } });
    const cardio = result.candidates.find((candidate) => candidate.slug === 'brisk-walk-interval');
    expect(cardio).toBeDefined();
    expect(cardio?.cautions.some((caution) => caution.includes('dislike cardio'))).toBe(true);
  });
});

describe('getExerciseCandidates — health/safety (conservative)', () => {
  it('excludes moderate/high load on a reported injured area but keeps light-load work with a caution', () => {
    const result = run({ trainingExperience: 'ADVANCED', health: { injuryAreas: ['knee'] } });
    for (const candidate of result.candidates) {
      const kneeLoad = (bySlug.get(candidate.slug)!.constraints ?? []).some((constraint) => constraint.area === 'knee' && (constraint.severity === 'moderate' || constraint.severity === 'high'));
      expect(kneeLoad).toBe(false);
    }
    expect(result.excluded.some((item) => item.slug === 'barbell-back-squat' && item.stage === 'health-safety')).toBe(true);
    const lightKnee = result.candidates.find((candidate) => candidate.slug === 'bodyweight-squat');
    expect(lightKnee?.status).toBe('caution');
    expect(lightKnee?.cautions.some((caution) => caution.includes('knee'))).toBe(true);
  });

  it('avoids high-impact movements for impact-sensitive reported conditions', () => {
    const result = run({ primaryGoal: 'Lose fat', health: { conditions: ['blood_pressure'] } });
    expect(result.candidates.every((candidate) => !(bySlug.get(candidate.slug)!.constraints ?? []).some((constraint) => constraint.constraintType === 'impact'))).toBe(true);
    expect(result.excluded.some((item) => item.slug === 'burpees' && item.stage === 'health-safety')).toBe(true);
  });

  it('excludes high technical/balance demand for a significant mobility limitation', () => {
    const result = run({ trainingExperience: 'ADVANCED', health: { mobilityLimitation: 'significant' } });
    expect(result.candidates.some((candidate) => candidate.slug === 'barbell-deadlift')).toBe(false);
  });

  it('preserves a medical-clearance pathway for a doctor-imposed restriction', () => {
    const result = run({ health: { doctorExerciseRestriction: true } });
    expect(result.requiresMedicalClearance).toBe(true);
    expect(result.safetyNotices.length).toBeGreaterThan(0);
    for (const candidate of result.candidates) expect(['mobility', 'cardio']).toContain(bySlug.get(candidate.slug)!.category);
    expect(result.excluded.some((item) => item.stage === 'health-safety' && item.reason.includes('medical clearance'))).toBe(true);
  });

  it('does not fabricate restrictions when health information is absent', () => {
    const result = run({});
    expect(result.requiresMedicalClearance).toBe(false);
    expect(result.candidates.every((candidate) => candidate.cautions.every((caution) => !caution.includes('reduce range')))).toBe(true);
    expect(result.candidates.length).toBeGreaterThan(0);
  });
});

describe('getExerciseCandidates — profiles, history and bookkeeping', () => {
  it('produces materially different candidate pools for different users', () => {
    const gym = run({ trainingExperience: 'INTERMEDIATE' });
    const home = run({ trainingExperience: 'INTERMEDIATE', trainingLocation: 'HOME', equipment: ['Dumbbells'] });
    expect(gym.candidates.map((candidate) => candidate.slug)).not.toEqual(home.candidates.map((candidate) => candidate.slug));
  });

  it('credits previous exercise history', () => {
    const result = run({ history: ['push-up'] });
    const pushUp = result.candidates.find((candidate) => candidate.slug === 'push-up');
    expect(pushUp?.reasons).toContain('You have performed this before.');
  });

  it('every candidate carries at least one reason and stage counts reconcile with exclusions', () => {
    const result = run({ trainingExperience: 'INTERMEDIATE' });
    for (const candidate of result.candidates) expect(candidate.reasons.length).toBeGreaterThan(0);
    const total = Object.values(result.stageExclusionCounts).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(result.excluded.length);
  });
});
