import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type RelationEdge } from './exercise-candidates';
import { generateWeeklyStructure, type StructureContext } from './workout-structure';
import { prescribeWorkout, type ExerciseMeta, type ExercisePrescription, type PrescribedSession, type PrescriptionContext } from './workout-prescription';
import { validateSession, validateWorkout, type ValidationContext } from './workout-validation';
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

function validatedFor(opts: { experience?: StructureContext['trainingExperience']; richGoal?: RichGoal; primaryGoal?: StructureContext['primaryGoal']; duration: StructureContext['workoutDurationMinutes']; days?: number }) {
  const query: CandidateQuery = { primaryGoal: opts.primaryGoal ?? 'Build muscle', trainingExperience: opts.experience ?? 'INTERMEDIATE', trainingLocation: 'GYM', equipment: GYM, richGoal: opts.richGoal };
  const pool = getExerciseCandidates(catalog, relations, query);
  const structure = generateWeeklyStructure(pool.candidates, { primaryGoal: opts.primaryGoal ?? 'Build muscle', richGoal: opts.richGoal, trainingExperience: opts.experience ?? 'INTERMEDIATE', trainingDays: weekdays(opts.days ?? 4), workoutDurationMinutes: opts.duration, requiresGentle: pool.requiresMedicalClearance });
  const prescriptionCtx: PrescriptionContext = { primaryGoal: opts.primaryGoal ?? 'Build muscle', richGoal: opts.richGoal, trainingExperience: opts.experience ?? 'INTERMEDIATE', trainingFrequency: opts.days ?? 4, workoutDurationMinutes: opts.duration, requiresGentle: pool.requiresMedicalClearance };
  const prescription = prescribeWorkout(structure, prescriptionCtx, META);
  return validateWorkout(prescription, { workoutDurationMinutes: opts.duration, requiresGentle: pool.requiresMedicalClearance });
}

// ---- Synthetic session helpers for targeted unit tests ----
function ex(partial: Partial<ExercisePrescription>): ExercisePrescription {
  return { order: 0, slug: 'x', name: 'X', movementPattern: 'squat', role: 'accessory', priority: 3, modality: 'reps', sets: { min: 3, max: 3 }, reps: { min: 10, max: 10 }, holdSeconds: null, durationMinutes: null, restSeconds: { min: 60, max: 60 }, intensity: 'moderate', optional: false, volumeContribution: 3, cautions: [], ...partial };
}
function session(exercises: ExercisePrescription[]): PrescribedSession {
  return { weekday: 'Monday', focus: 'Test', warmUp: { label: 'Warm-up', items: [{ label: 'cardio', durationMinutes: 5 }] }, coolDown: { label: 'Cool-down', items: [{ label: 'stretch', durationMinutes: 3 }] }, exercises: exercises.map((exercise, index) => ({ ...exercise, order: index })), estimatedMinutes: 0, totalWorkingSets: 0 };
}
const bigCtx: ValidationContext = { workoutDurationMinutes: 60 };

describe('Workout validation — realistic time across the pipeline', () => {
  const durations = [30, 45, 60, 90] as const;
  const goals: Array<{ name: string; primaryGoal: StructureContext['primaryGoal']; richGoal: RichGoal }> = [
    { name: 'strength', primaryGoal: 'Build muscle', richGoal: 'strength' },
    { name: 'muscle', primaryGoal: 'Build muscle', richGoal: 'build_muscle' },
    { name: 'fat loss', primaryGoal: 'Lose fat', richGoal: 'lose_fat' },
  ];

  for (const goal of goals) {
    it.each(durations)(`fits every ${goal.name} session into a %i-minute budget`, (duration) => {
      const validated = validatedFor({ primaryGoal: goal.primaryGoal, richGoal: goal.richGoal, duration });
      for (const sessionResult of validated.sessions) {
        expect(sessionResult.withinBudget).toBe(true);
        expect(sessionResult.committedMinutes).toBeLessThanOrEqual(duration);
        expect(sessionResult.time.setupSeconds).toBeGreaterThan(0);
        expect(sessionResult.time.totalMinutes).toBeGreaterThan(0);
        expect(sessionResult.exercises.some((exercise) => exercise.role === 'primary' && !exercise.optional)).toBe(true);
        expect(sessionResult.findings.length).toBeGreaterThan(0);
      }
    });
  }

  it.each(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const)('fits sessions for %s at a short 30-minute budget', (experience) => {
    const validated = validatedFor({ experience, duration: 30 });
    for (const sessionResult of validated.sessions) expect(sessionResult.withinBudget).toBe(true);
  });
});

describe('Workout validation — priority-based time adjustment', () => {
  it('keeps the primary and reduces lower-priority work when time is short', () => {
    const heavy = session([
      ex({ slug: 'main', role: 'primary', priority: 1, movementPattern: 'squat', sets: { min: 4, max: 5 }, reps: { min: 5, max: 5 }, restSeconds: { min: 150, max: 180 } } as Partial<ExercisePrescription>),
      ex({ slug: 'sec1', role: 'secondary', priority: 2, movementPattern: 'horizontal-push', sets: { min: 3, max: 4 }, restSeconds: { min: 120, max: 120 } } as Partial<ExercisePrescription>),
      ex({ slug: 'acc1', role: 'accessory', priority: 3, movementPattern: 'elbow-flexion' } as Partial<ExercisePrescription>),
      ex({ slug: 'acc2', role: 'accessory', priority: 3, movementPattern: 'elbow-extension' } as Partial<ExercisePrescription>),
      ex({ slug: 'con', role: 'conditioning', priority: 5, modality: 'conditioning', movementPattern: 'conditioning', reps: null, durationMinutes: { min: 10, max: 10 }, restSeconds: { min: 0, max: 0 }, volumeContribution: 0 } as Partial<ExercisePrescription>),
    ]);
    const result = validateSession(heavy, { workoutDurationMinutes: 30 });
    expect(result.withinBudget).toBe(true);
    expect(result.exercises.find((exercise) => exercise.slug === 'main')!.optional).toBe(false); // primary preserved
    expect(result.exercises.some((exercise) => exercise.optional)).toBe(true); // lower-priority reduced
    expect(result.findings.some((finding) => finding.code === 'time-over-adjusted')).toBe(true);
  });

  it('never drops a primary even when the budget is tiny', () => {
    const result = validateSession(session([
      ex({ slug: 'main', role: 'primary', priority: 1, movementPattern: 'squat', sets: { min: 3, max: 3 }, reps: { min: 5, max: 5 }, restSeconds: { min: 180, max: 180 } } as Partial<ExercisePrescription>),
      ex({ slug: 'sec', role: 'secondary', priority: 2, movementPattern: 'hip-hinge' } as Partial<ExercisePrescription>),
    ]), { workoutDurationMinutes: 20 });
    expect(result.exercises.find((exercise) => exercise.slug === 'main')!.optional).toBe(false);
  });
});

describe('Workout validation — duplication and volume', () => {
  it('reduces more than two exercises sharing a movement pattern', () => {
    const result = validateSession(session([
      ex({ slug: 'p1', role: 'secondary', priority: 2, movementPattern: 'horizontal-push' } as Partial<ExercisePrescription>),
      ex({ slug: 'p2', role: 'accessory', priority: 3, movementPattern: 'horizontal-push' } as Partial<ExercisePrescription>),
      ex({ slug: 'p3', role: 'accessory', priority: 3, movementPattern: 'horizontal-push' } as Partial<ExercisePrescription>),
    ]), bigCtx);
    const committedPush = result.exercises.filter((exercise) => !exercise.optional && exercise.movementPattern === 'horizontal-push');
    expect(committedPush.length).toBeLessThanOrEqual(2);
    expect(result.findings.some((finding) => finding.code === 'duplication-pattern')).toBe(true);
  });

  it('flags a session that is well under the available time', () => {
    const result = validateSession(session([
      ex({ slug: 'solo', role: 'primary', priority: 1, movementPattern: 'squat', sets: { min: 2, max: 2 }, reps: { min: 5, max: 5 }, restSeconds: { min: 60, max: 60 } } as Partial<ExercisePrescription>),
    ]), { workoutDurationMinutes: 90 });
    expect(result.findings.some((finding) => finding.code === 'under-utilized')).toBe(true);
  });

  it('flags excessive accessory work relative to primary work', () => {
    const result = validateSession(session([
      ex({ slug: 'main', role: 'primary', priority: 1, movementPattern: 'squat', sets: { min: 2, max: 2 } } as Partial<ExercisePrescription>),
      ex({ slug: 'a1', role: 'accessory', priority: 3, movementPattern: 'elbow-flexion', sets: { min: 2, max: 2 } } as Partial<ExercisePrescription>),
      ex({ slug: 'a2', role: 'accessory', priority: 3, movementPattern: 'elbow-extension', sets: { min: 2, max: 2 } } as Partial<ExercisePrescription>),
      ex({ slug: 'a3', role: 'accessory', priority: 3, movementPattern: 'shoulder-abduction', sets: { min: 2, max: 2 } } as Partial<ExercisePrescription>),
    ]), { workoutDurationMinutes: 90 });
    expect(result.findings.some((finding) => finding.code === 'excess-accessory')).toBe(true);
  });

  it('is deterministic', () => {
    const built = session([
      ex({ slug: 'main', role: 'primary', priority: 1, movementPattern: 'squat' } as Partial<ExercisePrescription>),
      ex({ slug: 'acc', role: 'accessory', priority: 3, movementPattern: 'elbow-flexion' } as Partial<ExercisePrescription>),
    ]);
    expect(validateSession(built, bigCtx)).toEqual(validateSession(built, bigCtx));
  });
});
