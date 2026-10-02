import { describe, expect, it } from '@jest/globals';
import { WorkoutPlannerService, WorkoutPlanningError } from './workout-planner.service';
import { evaluateSafety, filterCatalog } from './exercise-filter';
import { exerciseConstraints, exerciseLibrary, exerciseRelations } from './exercise-library';
import { ALL_MOVEMENT_PATTERNS } from './exercise-taxonomy';
import type { CatalogExercise, WorkoutPlanningInput } from './workout-planner.types';

// Build the in-memory catalog from the real V1 library (ids = slugs; constraints grouped by slug).
const constraintsBySlug = new Map<string, Array<{ constraintType: string; area: string | null; severity: string | null }>>();
for (const constraint of exerciseConstraints) {
  const list = constraintsBySlug.get(constraint.slug) ?? [];
  list.push({ constraintType: constraint.constraintType, area: constraint.area ?? null, severity: constraint.severity });
  constraintsBySlug.set(constraint.slug, list);
}
const catalog: CatalogExercise[] = exerciseLibrary.map((exercise) => ({ ...exercise, id: exercise.slug, constraints: constraintsBySlug.get(exercise.slug) ?? [] }));
const bySlug = new Map(catalog.map((exercise) => [exercise.id, exercise]));
const GYM_EQUIPMENT = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'];
const planner = new WorkoutPlannerService();

function input(partial: Partial<WorkoutPlanningInput>): WorkoutPlanningInput {
  return { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingDays: ['Monday', 'Wednesday', 'Friday'], workoutDurationMinutes: 45, trainingLocation: 'GYM', equipment: GYM_EQUIPMENT, ...partial };
}
const selectedExercises = (plan: { days: Array<{ exercises: Array<{ exerciseId: string }> }> }) => plan.days.flatMap((day) => day.exercises.map((exercise) => bySlug.get(exercise.exerciseId)!));

// Shared structural expectations applied to every non-restricted scenario.
function assertStructurallyValid(plan: ReturnType<typeof planner.generate>, context: WorkoutPlanningInput) {
  expect(plan.days.length).toBe(context.trainingDays.length);
  for (const day of plan.days) {
    const ids = day.exercises.map((exercise) => exercise.exerciseId);
    expect(new Set(ids).size).toBe(ids.length); // no within-day duplication
    expect(day.estimatedMinutes).toBeLessThanOrEqual(context.workoutDurationMinutes); // realistic duration
    for (const exercise of day.exercises) {
      const record = bySlug.get(exercise.exerciseId)!;
      expect(record.equipment.every((item) => context.equipment.includes(item))).toBe(true); // equipment respected
      expect(record.locations).toContain(context.trainingLocation);
    }
  }
}

describe('Workout engine — primary scenario matrix', () => {
  const scenarios: Array<{ name: string; context: WorkoutPlanningInput; expectDays: number }> = [
    { name: '1. Beginner + full gym + 3 days', context: input({ trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM_EQUIPMENT, trainingDays: ['Monday', 'Wednesday', 'Friday'] }), expectDays: 3 },
    { name: '2. Beginner + home + dumbbells + 3 days', context: input({ trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: ['Dumbbells'], trainingDays: ['Monday', 'Wednesday', 'Friday'] }), expectDays: 3 },
    { name: '3. Beginner + no equipment + 2 days', context: input({ trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: [], trainingDays: ['Tuesday', 'Saturday'] }), expectDays: 2 },
    { name: '4. Intermediate + full gym + 4 days', context: input({ trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM_EQUIPMENT, trainingDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'] }), expectDays: 4 },
    { name: '5. Advanced + full gym + 5 days', context: input({ trainingExperience: 'ADVANCED', trainingLocation: 'GYM', equipment: GYM_EQUIPMENT, trainingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }), expectDays: 5 },
    { name: '6. Muscle gain', context: input({ primaryGoal: 'Build muscle', richGoal: 'build_muscle' }), expectDays: 3 },
    { name: '7. Fat loss', context: input({ primaryGoal: 'Lose fat', richGoal: 'lose_fat' }), expectDays: 3 },
    { name: '8. Muscle gain + fat loss', context: input({ primaryGoal: 'Maintain fitness', richGoal: 'recomp' }), expectDays: 3 },
    { name: '9. Strength-focused', context: input({ primaryGoal: 'Build muscle', richGoal: 'strength', trainingExperience: 'INTERMEDIATE' }), expectDays: 3 },
    { name: '10. Endurance-focused', context: input({ primaryGoal: 'Maintain fitness', richGoal: 'endurance' }), expectDays: 3 },
    { name: '11. Limited workout duration', context: input({ workoutDurationMinutes: 30 }), expectDays: 3 },
    { name: '12. Limited equipment (bands)', context: input({ trainingLocation: 'HOME', equipment: ['Resistance bands'] }), expectDays: 3 },
    { name: '13. Strong preferences', context: input({ preferences: { enjoyedTypes: ['strength'], enjoyedPatterns: ['squat'] } }), expectDays: 3 },
    { name: '14. Exercise dislikes', context: input({ preferences: { dislikedExerciseSlugs: ['barbell-back-squat', 'front-squat', 'leg-press', 'dumbbell-goblet-squat'], dislikedTypes: ['cardio'] } }), expectDays: 3 },
    { name: '15. Returning after a break', context: input({ trainingExperience: 'INTERMEDIATE', recovery: { deload: true } }), expectDays: 3 },
    { name: '16. Reported physical limitations', context: input({ health: { injuryAreas: ['knee'], mobilityLimitation: 'some' } }), expectDays: 3 },
    { name: '18. Poor sleep / recovery', context: input({ trainingExperience: 'ADVANCED', recovery: { deload: true } }), expectDays: 3 },
  ];

  it.each(scenarios)('$name produces a structurally valid plan', ({ context, expectDays }) => {
    const plan = planner.generate(context, catalog);
    expect(plan.requiresMedicalClearance).toBeFalsy();
    expect(plan.days.length).toBe(expectDays);
    assertStructurallyValid(plan, context);
    // Sensible movement variety: each day draws on more than one movement pattern.
    for (const day of plan.days) expect(new Set(day.exercises.map((exercise) => bySlug.get(exercise.exerciseId)!.movementPattern)).size).toBeGreaterThanOrEqual(2);
  });

  it('17. Significant health restriction returns a gentle plan needing clearance', () => {
    const plan = planner.generate(input({ health: { doctorExerciseRestriction: true } }), catalog);
    expect(plan.requiresMedicalClearance).toBe(true);
    expect(plan.safetyNotices?.length).toBeGreaterThan(0);
    for (const exercise of selectedExercises(plan)) {
      expect(['mobility', 'cardio']).toContain(exercise.category);
      const constraints = exercise.constraints ?? [];
      expect(constraints.some((constraint) => constraint.constraintType === 'impact')).toBe(false);
      expect(constraints.some((constraint) => constraint.severity === 'moderate' || constraint.severity === 'high')).toBe(false);
    }
  });
});

describe('Workout engine — verification criteria', () => {
  it('respects the training-day count across 1, 2, 6 and 7 days', () => {
    for (const days of [['Monday'], ['Monday', 'Thursday'], ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']]) {
      const context = input({ trainingDays: days, trainingExperience: 'INTERMEDIATE' });
      const plan = planner.generate(context, catalog);
      expect(plan.days.map((day) => day.weekday)).toEqual(days);
      assertStructurallyValid(plan, context);
    }
  });

  it('never selects exercises that need unavailable equipment (dumbbell-only home user)', () => {
    const context = input({ trainingLocation: 'HOME', equipment: ['Dumbbells'] });
    for (const exercise of selectedExercises(planner.generate(context, catalog))) {
      expect(exercise.equipment.every((item) => item === 'Dumbbells')).toBe(true);
    }
  });

  it('uses only bodyweight movements when no equipment is available', () => {
    const context = input({ trainingLocation: 'OUTDOOR', equipment: [], trainingDays: ['Monday', 'Thursday'] });
    for (const exercise of selectedExercises(planner.generate(context, catalog))) expect(exercise.equipment).toHaveLength(0);
  });

  it('keeps every session within the duration budget and exercise count', () => {
    for (const [duration, count] of [[30, 3], [45, 4], [60, 5], [90, 6]] as const) {
      const context = input({ workoutDurationMinutes: duration, trainingExperience: 'INTERMEDIATE' });
      const plan = planner.generate(context, catalog);
      for (const day of plan.days) {
        expect(day.exercises.length).toBe(count);
        expect(day.estimatedMinutes).toBeLessThanOrEqual(duration);
      }
    }
  });

  it('does not ignore major muscle groups for a full-gym week', () => {
    const context = input({ trainingExperience: 'INTERMEDIATE', trainingDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'] });
    const muscles = new Set(selectedExercises(planner.generate(context, catalog)).flatMap((exercise) => exercise.muscleGroups));
    for (const group of ['chest', 'back', 'quads']) expect(muscles.has(group)).toBe(true);
  });

  it('lets preferences influence selection without overriding requirements', () => {
    const disliked = planner.generate(input({ preferences: { dislikedExerciseSlugs: ['barbell-back-squat', 'front-squat', 'leg-press', 'dumbbell-goblet-squat'] }, trainingExperience: 'ADVANCED' }), catalog);
    const squatPick = selectedExercises(disliked).find((exercise) => exercise.movementPattern === 'squat');
    expect(squatPick?.slug).toBe('bodyweight-squat'); // disliked variants avoided, pattern still covered

    const dislikeCardio = planner.generate(input({ primaryGoal: 'Lose fat', workoutDurationMinutes: 90, preferences: { dislikedTypes: ['cardio'] } }), catalog);
    const conditioningDay = dislikeCardio.days.find((day) => day.exercises.some((exercise) => bySlug.get(exercise.exerciseId)!.movementPattern === 'conditioning'));
    expect(conditioningDay).toBeDefined(); // requirement still filled despite dislike
  });

  it('respects reported injuries by excluding moderate/high load on the affected area', () => {
    const context = input({ health: { injuryAreas: ['knee'] }, trainingExperience: 'ADVANCED' });
    for (const exercise of selectedExercises(planner.generate(context, catalog))) {
      const kneeLoad = (exercise.constraints ?? []).some((constraint) => constraint.area === 'knee' && (constraint.severity === 'moderate' || constraint.severity === 'high'));
      expect(kneeLoad).toBe(false);
    }
  });

  it('avoids high-impact work for impact-sensitive reported conditions', () => {
    const safety = evaluateSafety({ conditions: ['blood_pressure'] });
    expect(safety.avoidHighImpact).toBe(true);
    const context = input({ health: { conditions: ['blood_pressure'] }, primaryGoal: 'Lose fat' });
    for (const exercise of selectedExercises(planner.generate(context, catalog))) {
      expect((exercise.constraints ?? []).some((constraint) => constraint.constraintType === 'impact')).toBe(false);
    }
  });

  it('reduces volume and avoids advanced exercises when deloading', () => {
    const normal = planner.generate(input({ trainingExperience: 'ADVANCED' }), catalog);
    const deload = planner.generate(input({ trainingExperience: 'ADVANCED', recovery: { deload: true } }), catalog);
    expect(deload.days[0].exercises[0].sets).toBeLessThan(normal.days[0].exercises[0].sets);
    for (const exercise of selectedExercises(deload)) expect(exercise.difficulty).not.toBe('ADVANCED');
  });

  it('produces different plans for materially different users', () => {
    const gym = planner.generate(input({ trainingExperience: 'INTERMEDIATE' }), catalog);
    const home = planner.generate(input({ trainingExperience: 'INTERMEDIATE', trainingLocation: 'HOME', equipment: ['Dumbbells'] }), catalog);
    expect(JSON.stringify(gym.days)).not.toEqual(JSON.stringify(home.days));
  });

  it('is deterministic for identical input', () => {
    const context = input({ trainingExperience: 'INTERMEDIATE', preferences: { enjoyedTypes: ['strength'] } });
    expect(planner.generate(context, catalog)).toEqual(planner.generate(context, catalog));
  });
});

describe('Workout engine — edge cases', () => {
  it('rejects invalid frequency and duration without inventing data', () => {
    expect(() => planner.generate(input({ trainingDays: [] }), catalog)).toThrow(WorkoutPlanningError);
    expect(() => planner.generate(input({ workoutDurationMinutes: 40 as 45 }), catalog)).toThrow('Workout duration must be');
  });

  it('handles a minimal profile with no preferences, health or recovery data', () => {
    const context = input({});
    expect(context.preferences).toBeUndefined();
    expect(context.health).toBeUndefined();
    const safety = evaluateSafety(context.health);
    expect(safety.verdict).toBe('ok'); // no restriction fabricated from missing info
    assertStructurallyValid(planner.generate(context, catalog), context);
  });

  it('handles conflicting preferences deterministically and still covers requirements', () => {
    const context = input({ preferences: { enjoyedTypes: ['cardio'], dislikedTypes: ['cardio'], cardioPreference: 'minimal' } });
    const plan = planner.generate(context, catalog);
    assertStructurallyValid(plan, context);
    expect(plan).toEqual(planner.generate(context, catalog));
  });

  it('throws a clear error when no exercises match the environment', () => {
    const onlyBarbell = catalog.filter((exercise) => exercise.equipment.includes('Barbell'));
    expect(() => planner.generate(input({ trainingLocation: 'OUTDOOR', equipment: [] }), onlyBarbell)).toThrow('No catalog exercises match');
  });
});

describe('Exercise library — V1 data integrity', () => {
  it('has unique slugs and names', () => {
    expect(new Set(exerciseLibrary.map((exercise) => exercise.slug)).size).toBe(exerciseLibrary.length);
    expect(new Set(exerciseLibrary.map((exercise) => exercise.name)).size).toBe(exerciseLibrary.length);
  });

  it('uses only known movement patterns', () => {
    for (const exercise of exerciseLibrary) expect(ALL_MOVEMENT_PATTERNS).toContain(exercise.movementPattern);
  });

  it('only references existing slugs in relationships and constraints', () => {
    const slugs = new Set(exerciseLibrary.map((exercise) => exercise.slug));
    for (const relation of exerciseRelations) { expect(slugs.has(relation.from)).toBe(true); expect(slugs.has(relation.to)).toBe(true); }
    for (const constraint of exerciseConstraints) expect(slugs.has(constraint.slug)).toBe(true);
  });

  it('covers every equipment tier and all 10 training categories/patterns of interest', () => {
    const hasBodyweight = exerciseLibrary.some((exercise) => exercise.equipment.length === 0);
    const hasDumbbell = exerciseLibrary.some((exercise) => exercise.equipment.includes('Dumbbells'));
    const hasBarbell = exerciseLibrary.some((exercise) => exercise.equipment.includes('Barbell'));
    const hasCable = exerciseLibrary.some((exercise) => exercise.equipment.includes('Cable'));
    const hasMachine = exerciseLibrary.some((exercise) => exercise.equipment.includes('Machines'));
    const hasBand = exerciseLibrary.some((exercise) => exercise.equipment.includes('Resistance bands'));
    expect([hasBodyweight, hasDumbbell, hasBarbell, hasCable, hasMachine, hasBand].every(Boolean)).toBe(true);
    for (const category of ['resistance', 'core', 'mobility', 'cardio', 'conditioning']) expect(exerciseLibrary.some((exercise) => exercise.category === category)).toBe(true);
  });

  it('provides a meaningful alternative sharing the pattern for key compound lifts', () => {
    const patternOf = new Map(exerciseLibrary.map((exercise) => [exercise.slug, exercise.movementPattern]));
    for (const relation of exerciseRelations.filter((item) => item.relationType === 'alternative-same-pattern')) {
      expect(patternOf.get(relation.from)).toBe(patternOf.get(relation.to));
    }
  });
});
