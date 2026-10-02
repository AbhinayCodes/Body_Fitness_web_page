import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type RelationEdge } from './exercise-candidates';
import { generateWeeklyStructure, type StructureContext, type WeeklyStructure } from './workout-structure';
import { prescribeWorkout, type ExerciseMeta, type PrescriptionContext } from './workout-prescription';
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
const META: Map<string, ExerciseMeta> = new Map(exerciseLibrary.map((exercise) => [exercise.slug, { mechanics: exercise.mechanics, difficulty: exercise.difficulty, estimatedMinutes: exercise.estimatedMinutes }]));
const metaBy = (slug: string) => META.get(slug)!;
const GYM = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'];
const weekdays = (n: number) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, n);

function buildStructure(query: Partial<CandidateQuery>, structurePartial: Partial<StructureContext>): { structure: WeeklyStructure; requiresGentle: boolean } {
  const fullQuery: CandidateQuery = { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, ...query };
  const pool = getExerciseCandidates(catalog, relations, fullQuery);
  const context: StructureContext = { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingDays: weekdays(4), workoutDurationMinutes: 60, requiresGentle: pool.requiresMedicalClearance, ...structurePartial };
  return { structure: generateWeeklyStructure(pool.candidates, context), requiresGentle: pool.requiresMedicalClearance };
}
function ctx(partial: Partial<PrescriptionContext>): PrescriptionContext {
  return { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingFrequency: 4, workoutDurationMinutes: 60, ...partial };
}
const allExercises = (prescription: ReturnType<typeof prescribeWorkout>) => prescription.sessions.flatMap((session) => session.exercises);

describe('prescribeWorkout — shape and ranges', () => {
  it('expresses every exercise as valid ranges with coherent modality', () => {
    const { structure } = buildStructure({ trainingExperience: 'ADVANCED' }, { trainingExperience: 'ADVANCED', trainingDays: weekdays(6), richGoal: 'build_muscle' });
    const prescription = prescribeWorkout(structure, ctx({ trainingExperience: 'ADVANCED', trainingFrequency: 6, richGoal: 'build_muscle' }), META);
    for (const exercise of allExercises(prescription)) {
      expect(exercise.sets.min).toBeGreaterThanOrEqual(1);
      expect(exercise.sets.min).toBeLessThanOrEqual(exercise.sets.max);
      expect(exercise.restSeconds.min).toBeLessThanOrEqual(exercise.restSeconds.max);
      expect(['light', 'moderate', 'hard', 'very-hard']).toContain(exercise.intensity);
      if (exercise.modality === 'reps') { expect(exercise.reps).not.toBeNull(); expect(exercise.holdSeconds).toBeNull(); expect(exercise.durationMinutes).toBeNull(); }
      if (exercise.modality === 'hold') { expect(exercise.holdSeconds).not.toBeNull(); expect(exercise.reps).toBeNull(); }
      if (exercise.modality === 'conditioning') { expect(exercise.durationMinutes).not.toBeNull(); expect(exercise.reps).toBeNull(); }
    }
  });

  it('does not prescribe a single uniform sets x reps for everything', () => {
    const { structure } = buildStructure({ trainingExperience: 'ADVANCED' }, { trainingExperience: 'ADVANCED', trainingDays: weekdays(6), richGoal: 'build_muscle' });
    const prescription = prescribeWorkout(structure, ctx({ trainingExperience: 'ADVANCED', trainingFrequency: 6, richGoal: 'build_muscle' }), META);
    const repSignatures = new Set(allExercises(prescription).filter((exercise) => exercise.reps).map((exercise) => `${exercise.reps!.min}-${exercise.reps!.max}`));
    expect(repSignatures.size).toBeGreaterThan(1);
  });

  it('includes warm-up and cool-down guidance and a session time estimate', () => {
    const { structure } = buildStructure({}, {});
    const prescription = prescribeWorkout(structure, ctx({}), META);
    for (const session of prescription.sessions) {
      expect(session.warmUp).toBeDefined();
      expect(session.coolDown).toBeDefined();
      expect(session.estimatedMinutes).toBeGreaterThan(0);
      expect(session.totalWorkingSets).toBeGreaterThan(0);
    }
  });

  it('is deterministic for identical input', () => {
    const { structure } = buildStructure({}, {});
    const context = ctx({});
    expect(prescribeWorkout(structure, context, META)).toEqual(prescribeWorkout(structure, context, META));
  });
});

describe('prescribeWorkout — goal, role and difficulty influence', () => {
  it('uses low reps and long rest for strength compounds, higher reps and short rest for fat loss', () => {
    const strength = buildStructure({ richGoal: 'strength' }, { richGoal: 'strength' });
    const strengthRx = prescribeWorkout(strength.structure, ctx({ richGoal: 'strength' }), META);
    const strengthCompound = allExercises(strengthRx).find((exercise) => exercise.role === 'primary')!;
    expect(strengthCompound.reps!.max).toBeLessThanOrEqual(6);
    expect(strengthCompound.restSeconds.min).toBeGreaterThanOrEqual(120);

    const fatloss = buildStructure({ primaryGoal: 'Lose fat', richGoal: 'lose_fat' }, { primaryGoal: 'Lose fat', richGoal: 'lose_fat' });
    const fatlossRx = prescribeWorkout(fatloss.structure, ctx({ primaryGoal: 'Lose fat', richGoal: 'lose_fat' }), META);
    const fatlossCompound = allExercises(fatlossRx).find((exercise) => exercise.role === 'primary')!;
    expect(fatlossCompound.reps!.min).toBeGreaterThanOrEqual(10);
    expect(fatlossCompound.restSeconds.max).toBeLessThanOrEqual(90);
  });

  it('prescribes compounds with fewer reps than isolation work', () => {
    const { structure } = buildStructure({ trainingExperience: 'ADVANCED', richGoal: 'build_muscle' }, { trainingExperience: 'ADVANCED', trainingDays: weekdays(6), richGoal: 'build_muscle' });
    const prescription = prescribeWorkout(structure, ctx({ trainingExperience: 'ADVANCED', trainingFrequency: 6, richGoal: 'build_muscle' }), META);
    const compound = allExercises(prescription).find((exercise) => exercise.reps && metaBy(exercise.slug).mechanics === 'compound')!;
    const isolation = allExercises(prescription).find((exercise) => exercise.reps && metaBy(exercise.slug).mechanics === 'isolation')!;
    expect(compound.reps!.max).toBeLessThanOrEqual(isolation.reps!.max);
  });

  it('treats isometric core work as time-based holds and conditioning as time-based intervals', () => {
    const { structure } = buildStructure({ primaryGoal: 'Lose fat', richGoal: 'lose_fat' }, { primaryGoal: 'Lose fat', richGoal: 'lose_fat', trainingDays: weekdays(3) });
    const prescription = prescribeWorkout(structure, ctx({ primaryGoal: 'Lose fat', richGoal: 'lose_fat', trainingFrequency: 3 }), META);
    const plank = allExercises(prescription).find((exercise) => exercise.slug === 'plank');
    if (plank) { expect(plank.modality).toBe('hold'); expect(plank.holdSeconds).not.toBeNull(); expect(plank.reps).toBeNull(); }
    const conditioning = allExercises(prescription).find((exercise) => exercise.role === 'conditioning');
    expect(conditioning).toBeDefined();
    expect(conditioning!.modality).toBe('conditioning');
    expect(conditioning!.durationMinutes).not.toBeNull();
    expect(conditioning!.volumeContribution).toBe(0);
    expect(conditioning!.optional).toBe(false); // conditioning is required for a fat-loss goal
  });

  it('marks conditioning optional for a muscle-building goal', () => {
    const { structure } = buildStructure({ richGoal: 'build_muscle' }, { richGoal: 'build_muscle', trainingDays: weekdays(3) });
    const prescription = prescribeWorkout(structure, ctx({ richGoal: 'build_muscle', trainingFrequency: 3 }), META);
    const conditioning = allExercises(prescription).find((exercise) => exercise.role === 'conditioning');
    if (conditioning) expect(conditioning.optional).toBe(true);
  });
});

describe('prescribeWorkout — experience, recovery and safety', () => {
  it('caps beginner set counts and allows advanced more volume', () => {
    const { structure } = buildStructure({}, {});
    const beginner = prescribeWorkout(structure, ctx({ trainingExperience: 'BEGINNER' }), META);
    for (const exercise of allExercises(beginner)) expect(exercise.sets.max).toBeLessThanOrEqual(3);
    const advanced = prescribeWorkout(structure, ctx({ trainingExperience: 'ADVANCED' }), META);
    expect(allExercises(advanced).some((exercise) => exercise.sets.max >= 4)).toBe(true);
  });

  it('reduces volume and effort on a deload without reselecting exercises', () => {
    const { structure } = buildStructure({}, {});
    const normal = prescribeWorkout(structure, ctx({}), META);
    const deload = prescribeWorkout(structure, ctx({ recovery: { deload: true } }), META);
    const totalSets = (rx: typeof normal) => rx.sessions.reduce((sum, session) => sum + session.totalWorkingSets, 0);
    expect(totalSets(deload)).toBeLessThan(totalSets(normal));
    expect(allExercises(deload).some((exercise) => (exercise.note ?? '').includes('recover'))).toBe(true);
  });

  it('bumps compound intensity when strength is a secondary goal', () => {
    const { structure } = buildStructure({ richGoal: 'build_muscle' }, { richGoal: 'build_muscle' });
    const without = prescribeWorkout(structure, ctx({ richGoal: 'build_muscle' }), META);
    const withStrength = prescribeWorkout(structure, ctx({ richGoal: 'build_muscle', secondaryGoals: ['Improve strength'] }), META);
    const order = ['light', 'moderate', 'hard', 'very-hard'];
    const primaryIntensity = (rx: typeof without) => order.indexOf(allExercises(rx).find((exercise) => exercise.role === 'primary')!.intensity);
    expect(primaryIntensity(withStrength)).toBeGreaterThanOrEqual(primaryIntensity(without));
  });

  it('keeps flagged (caution) exercises sub-maximal', () => {
    const { structure } = buildStructure({ health: { injuryAreas: ['knee'] } }, { health: undefined });
    const prescription = prescribeWorkout(structure, ctx({}), META);
    for (const exercise of allExercises(prescription)) {
      if (exercise.cautions.length) expect(['light', 'moderate']).toContain(exercise.intensity);
    }
  });

  it('prescribes only gentle effort when medical clearance is required', () => {
    const { structure, requiresGentle } = buildStructure({ health: { doctorExerciseRestriction: true } }, { requiresGentle: true, trainingDays: weekdays(3) });
    expect(requiresGentle).toBe(true);
    const prescription = prescribeWorkout(structure, ctx({ requiresGentle: true, trainingFrequency: 3 }), META);
    for (const exercise of allExercises(prescription)) {
      expect(exercise.intensity).toBe('light');
      expect(exercise.sets.max).toBeLessThanOrEqual(2);
    }
  });
});
