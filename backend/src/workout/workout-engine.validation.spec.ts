import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type CandidateResult, type RelationEdge } from './exercise-candidates';
import { generateWeeklyStructure, type StructureContext, type WeeklyStructure } from './workout-structure';
import { exerciseConstraints, exerciseLibrary, exerciseRelations } from './exercise-library';
import type { CatalogExercise, RichGoal, WorkoutPreferences, HealthContext } from './workout-planner.types';

// ---- Real engine stack under test: Exercise Database -> Filtering -> Selection -> Structure ----
const constraintsBySlug = new Map<string, Array<{ constraintType: string; area: string | null; severity: string | null }>>();
for (const constraint of exerciseConstraints) {
  const list = constraintsBySlug.get(constraint.slug) ?? [];
  list.push({ constraintType: constraint.constraintType, area: constraint.area ?? null, severity: constraint.severity });
  constraintsBySlug.set(constraint.slug, list);
}
const catalog: CatalogExercise[] = exerciseLibrary.map((exercise) => ({ ...exercise, id: exercise.slug, constraints: constraintsBySlug.get(exercise.slug) ?? [] }));
const relations: RelationEdge[] = exerciseRelations.map((relation) => ({ from: relation.from, to: relation.to, relationType: relation.relationType }));
const bySlug = new Map(catalog.map((exercise) => [exercise.slug, exercise]));
const GYM = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'];
const weekdays = (count: number) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, count);

interface Profile {
  primaryGoal: 'Build muscle' | 'Lose fat' | 'Maintain fitness';
  richGoal?: RichGoal;
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  trainingLocation: 'HOME' | 'GYM' | 'OUTDOOR' | 'MIXED';
  equipment: string[];
  trainingDays: string[];
  workoutDurationMinutes: 30 | 45 | 60 | 90;
  preferences?: WorkoutPreferences;
  health?: HealthContext;
  recovery?: { deload?: boolean };
  priorityMuscles?: string[];
  history?: string[];
}

// Mirrors how WorkoutStructureService wires Phase 3 -> Phase 5 (requiresGentle comes from the pool).
function run(profile: Profile): { pool: CandidateResult; structure: WeeklyStructure } {
  const query: CandidateQuery = { primaryGoal: profile.primaryGoal, trainingExperience: profile.trainingExperience, trainingLocation: profile.trainingLocation, equipment: profile.equipment, richGoal: profile.richGoal, preferences: profile.preferences, health: profile.health, recovery: profile.recovery, history: profile.history };
  const pool = getExerciseCandidates(catalog, relations, query);
  const context: StructureContext = { primaryGoal: profile.primaryGoal, richGoal: profile.richGoal, trainingExperience: profile.trainingExperience, trainingDays: profile.trainingDays, workoutDurationMinutes: profile.workoutDurationMinutes, recovery: profile.recovery, priorityMuscles: profile.priorityMuscles, requiresGentle: pool.requiresMedicalClearance };
  return { pool, structure: generateWeeklyStructure(pool.candidates, context) };
}

function difficultyTier(experience: Profile['trainingExperience'], deload?: boolean): string[] {
  const tiers = experience === 'BEGINNER' ? ['BEGINNER'] : experience === 'INTERMEDIATE' ? ['BEGINNER', 'INTERMEDIATE'] : ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  return deload ? tiers.filter((tier) => tier !== 'ADVANCED') : tiers;
}

function assertValidStructure(profile: Profile, pool: CandidateResult, structure: WeeklyStructure) {
  const gentle = pool.requiresMedicalClearance;
  expect(structure.days.map((day) => day.weekday)).toEqual(profile.trainingDays); // correct days, ordered
  const tier = difficultyTier(profile.trainingExperience, profile.recovery?.deload);
  for (const day of structure.days) {
    const slugs = day.exercises.map((exercise) => exercise.slug);
    expect(new Set(slugs).size).toBe(slugs.length); // no duplication
    expect(day.estimatedMinutes).toBeLessThanOrEqual(profile.workoutDurationMinutes); // realistic duration
    expect(day.exercises.map((exercise) => exercise.order)).toEqual(day.exercises.map((_, index) => index)); // ordered

    const patternCounts: Record<string, number> = {};
    for (const exercise of day.exercises) patternCounts[exercise.movementPattern] = (patternCounts[exercise.movementPattern] ?? 0) + 1;
    for (const value of Object.values(patternCounts)) expect(value).toBeLessThanOrEqual(2); // no near-identical stacking

    for (const exercise of day.exercises) {
      const record = bySlug.get(exercise.slug)!;
      expect(record.equipment.every((item) => profile.equipment.includes(item))).toBe(true); // equipment respected
      expect(record.locations).toContain(profile.trainingLocation);
      if (gentle) { expect(['mobility', 'cardio']).toContain(record.category); continue; }
      expect(tier).toContain(record.difficulty); // matches experience / deload
      // health/safety respected
      const constraints = record.constraints ?? [];
      for (const area of profile.health?.injuryAreas ?? []) expect(constraints.some((constraint) => constraint.area === area && (constraint.severity === 'moderate' || constraint.severity === 'high'))).toBe(false);
      if ((profile.health?.conditions ?? []).some((condition) => ['heart', 'blood_pressure'].includes(condition))) expect(constraints.some((constraint) => constraint.constraintType === 'impact')).toBe(false);
      if (profile.health?.mobilityLimitation === 'significant') expect(constraints.some((constraint) => (constraint.constraintType === 'technical-demand' && constraint.severity === 'high') || (constraint.constraintType === 'balance-demand' && (constraint.severity === 'moderate' || constraint.severity === 'high')))).toBe(false);
    }
    if (!gentle) expect(day.movementRequirements.length).toBeGreaterThan(0); // sensible movement requirements
  }
}

describe('Workout engine validation — scenario matrix', () => {
  const scenarios: Array<{ name: string; profile: Profile }> = [
    { name: '1. Beginner + full gym + 3 days', profile: { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(3), workoutDurationMinutes: 45 } },
    { name: '2. Beginner + home + dumbbells + 3 days', profile: { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: ['Dumbbells'], trainingDays: weekdays(3), workoutDurationMinutes: 45 } },
    { name: '3. Beginner + no equipment + 2 days', profile: { primaryGoal: 'Maintain fitness', trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: [], trainingDays: weekdays(2), workoutDurationMinutes: 45 } },
    { name: '4. Intermediate + full gym + 4 days', profile: { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 } },
    { name: '5. Advanced + full gym + 5 days', profile: { primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'ADVANCED', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(5), workoutDurationMinutes: 60 } },
    { name: '6. Muscle gain', profile: { primaryGoal: 'Build muscle', richGoal: 'build_muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 } },
    { name: '7. Fat loss', profile: { primaryGoal: 'Lose fat', richGoal: 'lose_fat', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 45 } },
    { name: '8. Muscle gain + fat loss', profile: { primaryGoal: 'Maintain fitness', richGoal: 'recomp', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 } },
    { name: '9. Strength-focused', profile: { primaryGoal: 'Build muscle', richGoal: 'strength', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 } },
    { name: '10. Endurance-focused', profile: { primaryGoal: 'Maintain fitness', richGoal: 'endurance', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 45 } },
    { name: '11. Limited workout duration', profile: { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 30 } },
    { name: '12. Limited equipment (bands)', profile: { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: ['Resistance bands'], trainingDays: weekdays(3), workoutDurationMinutes: 45 } },
    { name: '13. Strong preferences', profile: { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, preferences: { enjoyedTypes: ['bodyweight'], enjoyedPatterns: ['squat'] } } },
    { name: '14. Exercise dislikes', profile: { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, preferences: { dislikedExerciseSlugs: ['barbell-back-squat', 'front-squat'], dislikedTypes: ['cardio'] } } },
    { name: '15. Returning after a long break', profile: { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, recovery: { deload: true } } },
    { name: '16. Reported physical limitations', profile: { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, health: { injuryAreas: ['knee'], mobilityLimitation: 'some' } } },
    { name: '17. Significant health restriction', profile: { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(3), workoutDurationMinutes: 45, health: { doctorExerciseRestriction: true } } },
    { name: '18. Poor sleep / recovery (deload)', profile: { primaryGoal: 'Build muscle', trainingExperience: 'ADVANCED', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60, recovery: { deload: true } } },
  ];

  it.each(scenarios)('$name is valid end-to-end', ({ profile }) => {
    const { pool, structure } = run(profile);
    assertValidStructure(profile, pool, structure);
  });

  it('17. Significant health restriction requires clearance and stays gentle', () => {
    const { pool, structure } = run(scenarios[16].profile);
    expect(pool.requiresMedicalClearance).toBe(true);
    expect(pool.safetyNotices.length).toBeGreaterThan(0);
    expect(structure.archetype).toBe('gentle-movement');
  });
});

describe('Workout engine validation — cross-cutting properties', () => {
  const base: Profile = { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 };

  it('does not ignore major muscle groups for a full-gym week', () => {
    const { structure } = run({ ...base, trainingExperience: 'ADVANCED', trainingDays: weekdays(5) });
    const muscles = new Set(structure.days.flatMap((day) => day.exercises).flatMap((exercise) => exercise.muscleGroups));
    for (const group of ['chest', 'back', 'quads']) expect(muscles.has(group)).toBe(true);
  });

  it('lets preferences influence selection', () => {
    const neutral = run({ ...base, trainingExperience: 'ADVANCED' }).structure;
    const prefersBodyweight = run({ ...base, trainingExperience: 'ADVANCED', preferences: { enjoyedTypes: ['bodyweight'] } }).structure;
    expect(JSON.stringify(neutral.days)).not.toEqual(JSON.stringify(prefersBodyweight.days));
  });

  it('does not let preferences override program requirements', () => {
    const { structure } = run({ ...base, primaryGoal: 'Lose fat', richGoal: 'lose_fat', workoutDurationMinutes: 90, preferences: { dislikedTypes: ['cardio'] } });
    const conditioning = structure.days.some((day) => day.exercises.some((exercise) => exercise.movementPattern === 'conditioning'));
    expect(conditioning).toBe(true);
  });

  it('does not fabricate assumptions from missing information', () => {
    const { pool, structure } = run({ ...base });
    expect(pool.requiresMedicalClearance).toBe(false);
    const cautions = structure.days.flatMap((day) => day.exercises).flatMap((exercise) => exercise.cautions);
    expect(cautions.some((caution) => caution.includes('reduce range'))).toBe(false); // no injury caution invented
    expect(structure.days.length).toBe(4);
  });

  it('suggests meaningful alternatives for equipment-excluded exercises', () => {
    const { pool } = run({ ...base, trainingLocation: 'HOME', equipment: ['Dumbbells'] });
    const barbell = pool.excluded.find((item) => item.slug === 'barbell-bench-press');
    expect(barbell?.stage).toBe('equipment');
    expect(barbell?.suggestedAlternatives.length).toBeGreaterThan(0);
  });

  it('covers a pattern via an alternative when the whole pattern is removed', () => {
    const { structure } = run({ ...base, trainingDays: weekdays(3), health: { injuryAreas: ['knee'] }, preferences: { dislikedExerciseSlugs: ['bodyweight-squat', 'dumbbell-goblet-squat', 'barbell-back-squat', 'leg-press', 'front-squat'] } });
    // squat pattern is emptied by injury + dislikes; full-body sessions should still cover the squat slot via knee-extension.
    const squatDay = structure.days[0];
    expect(squatDay.uncoveredPatterns).not.toContain('squat');
  });

  it('gives materially different plans to different users', () => {
    const a = run({ ...base, trainingExperience: 'BEGINNER', trainingDays: weekdays(3) }).structure;
    const b = run({ ...base, trainingExperience: 'ADVANCED', trainingDays: weekdays(5) }).structure;
    const c = run({ ...base, primaryGoal: 'Lose fat', richGoal: 'lose_fat' }).structure;
    expect(a.archetype === b.archetype && b.archetype === c.archetype).toBe(false);
  });
});

describe('Workout engine validation — edge cases', () => {
  const base: Profile = { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, trainingDays: weekdays(4), workoutDurationMinutes: 60 };

  it.each([1, 2, 6, 7])('handles %i training days', (count) => {
    const profile = { ...base, trainingDays: weekdays(count) };
    const { pool, structure } = run(profile);
    assertValidStructure(profile, pool, structure);
  });

  it('keeps very short sessions short', () => {
    const profile = { ...base, workoutDurationMinutes: 30 as const };
    const { structure } = run(profile);
    for (const day of structure.days) { expect(day.exercises.length).toBeLessThanOrEqual(3); expect(day.estimatedMinutes).toBeLessThanOrEqual(30); }
  });

  it('handles no equipment at all', () => {
    const profile: Profile = { ...base, trainingLocation: 'HOME', equipment: [], trainingDays: weekdays(3) };
    const { pool, structure } = run(profile);
    assertValidStructure(profile, pool, structure);
    for (const exercise of structure.days.flatMap((day) => day.exercises)) expect(bySlug.get(exercise.slug)!.equipment).toHaveLength(0);
  });

  it('handles a minimal profile and ignores non-training fields (unknown body-fat / activity)', () => {
    // Body-fat % and activity level are not workout-engine inputs; a minimal profile must still generate.
    const profile: Profile = { primaryGoal: 'Maintain fitness', trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: [], trainingDays: weekdays(2), workoutDurationMinutes: 30 };
    const { structure } = run(profile);
    expect(structure.days.length).toBe(2);
  });

  it('handles conflicting preferences deterministically', () => {
    const profile: Profile = { ...base, primaryGoal: 'Lose fat', richGoal: 'lose_fat', preferences: { enjoyedTypes: ['cardio'], dislikedTypes: ['cardio'], cardioPreference: 'minimal' } };
    const first = run(profile).structure;
    const second = run(profile).structure;
    expect(first).toEqual(second);
    assertValidStructure(profile, run(profile).pool, first);
  });

  it('is deterministic for identical input across the whole pipeline', () => {
    const profile = { ...base, trainingDays: weekdays(5), trainingExperience: 'ADVANCED' as const };
    expect(run(profile).structure).toEqual(run(profile).structure);
  });
});
