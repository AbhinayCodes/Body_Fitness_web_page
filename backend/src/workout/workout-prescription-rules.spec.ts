import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type RelationEdge } from './exercise-candidates';
import { generateWeeklyStructure, type StructureContext, type WeeklyStructure } from './workout-structure';
import { prescribeWorkout, type ExerciseMeta, type PrescriptionContext } from './workout-prescription';
import { exerciseConstraints, exerciseLibrary, exerciseRelations } from './exercise-library';
import type { CatalogExercise, RichGoal } from './workout-planner.types';

const constraintsBySlug = new Map<string, Array<{ constraintType: string; area: string | null; severity: string | null }>>();
for (const constraint of exerciseConstraints) {
  const list = constraintsBySlug.get(constraint.slug) ?? [];
  list.push({ constraintType: constraint.constraintType, area: constraint.area ?? null, severity: constraint.severity });
  constraintsBySlug.set(constraint.slug, list);
}
const catalog: CatalogExercise[] = exerciseLibrary.map((exercise) => ({ ...exercise, id: exercise.slug, constraints: constraintsBySlug.get(exercise.slug) ?? [] }));
const relations: RelationEdge[] = exerciseRelations.map((relation) => ({ from: relation.from, to: relation.to, relationType: relation.relationType }));
const META: Map<string, ExerciseMeta> = new Map(exerciseLibrary.map((exercise) => [exercise.slug, { mechanics: exercise.mechanics, difficulty: exercise.difficulty, estimatedMinutes: exercise.estimatedMinutes }]));
const GYM = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'];
const weekdays = (n: number) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, n);

function structureFor(opts: { experience?: StructureContext['trainingExperience']; richGoal?: RichGoal; primaryGoal?: StructureContext['primaryGoal']; days?: number; duration?: StructureContext['workoutDurationMinutes'] }): WeeklyStructure {
  const query: CandidateQuery = { primaryGoal: opts.primaryGoal ?? 'Build muscle', trainingExperience: opts.experience ?? 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, richGoal: opts.richGoal };
  const pool = getExerciseCandidates(catalog, relations, query);
  const context: StructureContext = { primaryGoal: opts.primaryGoal ?? 'Build muscle', richGoal: opts.richGoal, trainingExperience: opts.experience ?? 'INTERMEDIATE', trainingDays: weekdays(opts.days ?? 4), workoutDurationMinutes: opts.duration ?? 60, requiresGentle: pool.requiresMedicalClearance };
  return generateWeeklyStructure(pool.candidates, context);
}
function ctx(partial: Partial<PrescriptionContext>): PrescriptionContext {
  return { primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE', trainingFrequency: 4, workoutDurationMinutes: 60, ...partial };
}
const all = (rx: ReturnType<typeof prescribeWorkout>) => rx.sessions.flatMap((session) => session.exercises);

describe('Prescription rules — exercise priority', () => {
  it('assigns an explicit priority aligned with role (primary most important)', () => {
    const structure = structureFor({ experience: 'ADVANCED', richGoal: 'build_muscle', days: 6 });
    const rx = prescribeWorkout(structure, ctx({ trainingExperience: 'ADVANCED', trainingFrequency: 6, richGoal: 'build_muscle' }), META);
    const ROLE_PRIORITY: Record<string, number> = { primary: 1, secondary: 2, accessory: 3, core: 4, conditioning: 5, mobility: 6 };
    for (const exercise of all(rx)) expect(exercise.priority).toBe(ROLE_PRIORITY[exercise.role]);
    for (const session of rx.sessions) expect(session.exercises.some((exercise) => exercise.priority === 1)).toBe(true); // every lifting session has a primary
  });

  it('ranks a compound primary ahead of isolation accessories', () => {
    const structure = structureFor({ experience: 'ADVANCED', richGoal: 'build_muscle', days: 6 });
    const rx = prescribeWorkout(structure, ctx({ trainingExperience: 'ADVANCED', trainingFrequency: 6, richGoal: 'build_muscle' }), META);
    const primary = all(rx).find((exercise) => exercise.role === 'primary')!;
    const accessory = all(rx).find((exercise) => exercise.role === 'accessory');
    if (accessory) expect(primary.priority).toBeLessThan(accessory.priority);
  });
});

describe('Prescription rules — fitting the available time', () => {
  const goals: Array<{ name: string; primaryGoal: PrescriptionContext['primaryGoal']; richGoal: RichGoal }> = [
    { name: 'strength', primaryGoal: 'Build muscle', richGoal: 'strength' },
    { name: 'muscle', primaryGoal: 'Build muscle', richGoal: 'build_muscle' },
    { name: 'fat loss', primaryGoal: 'Lose fat', richGoal: 'lose_fat' },
  ];
  const durations = [30, 45, 60, 90] as const;

  for (const goal of goals) {
    it.each(durations)(`keeps committed work within a ${'%i'}-minute budget for ${goal.name}`, (duration) => {
      const structure = structureFor({ primaryGoal: goal.primaryGoal, richGoal: goal.richGoal, duration });
      const rx = prescribeWorkout(structure, ctx({ primaryGoal: goal.primaryGoal, richGoal: goal.richGoal, workoutDurationMinutes: duration }), META);
      for (const session of rx.sessions) expect(session.estimatedMinutes).toBeLessThanOrEqual(duration);
    });
  }

  it('still keeps a non-optional primary when time is short', () => {
    const structure = structureFor({ richGoal: 'strength', duration: 30 });
    const rx = prescribeWorkout(structure, ctx({ richGoal: 'strength', workoutDurationMinutes: 30 }), META);
    for (const session of rx.sessions) expect(session.exercises.some((exercise) => exercise.role === 'primary' && !exercise.optional)).toBe(true);
  });

  it('commits less volume when the same session has less time', () => {
    const structure = structureFor({ duration: 60 });
    const short = prescribeWorkout(structure, ctx({ workoutDurationMinutes: 30 }), META);
    const long = prescribeWorkout(structure, ctx({ workoutDurationMinutes: 90 }), META);
    const sets = (rx: typeof short) => rx.sessions.reduce((sum, session) => sum + session.totalWorkingSets, 0);
    expect(sets(short)).toBeLessThanOrEqual(sets(long));
  });

  it('is deterministic for identical input', () => {
    const structure = structureFor({ richGoal: 'strength', duration: 45 });
    const context = ctx({ richGoal: 'strength', workoutDurationMinutes: 45 });
    expect(prescribeWorkout(structure, context, META)).toEqual(prescribeWorkout(structure, context, META));
  });
});

describe('Prescription rules — varied training days', () => {
  it.each([1, 3, 5])('prescribes one session per training day (%i days)', (days) => {
    const structure = structureFor({ experience: 'ADVANCED', days });
    const rx = prescribeWorkout(structure, ctx({ trainingExperience: 'ADVANCED', trainingFrequency: days }), META);
    expect(rx.sessions.length).toBe(days);
    for (const session of rx.sessions) expect(session.exercises.length).toBeGreaterThan(0);
  });
});
