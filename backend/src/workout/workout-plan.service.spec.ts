import { describe, expect, it, jest } from '@jest/globals';
import { WorkoutPlanService } from './workout-plan.service';
import { exerciseConstraints, exerciseLibrary, exerciseRelations } from './exercise-library';

// Catalog rows shaped like Prisma Exercise (id = slug for the test) with constraints included.
const constraintsBySlug = new Map<string, Array<{ constraintType: string; area: string | null; severity: string | null }>>();
for (const constraint of exerciseConstraints) {
  const list = constraintsBySlug.get(constraint.slug) ?? [];
  list.push({ constraintType: constraint.constraintType, area: constraint.area ?? null, severity: constraint.severity ?? null });
  constraintsBySlug.set(constraint.slug, list);
}
const catalogRows = exerciseLibrary.map((exercise) => ({ ...exercise, id: exercise.slug, constraints: constraintsBySlug.get(exercise.slug) ?? [] }));
const relationRows = exerciseRelations.map((relation) => ({ fromExerciseId: relation.from, toExerciseId: relation.to, relationType: relation.relationType }));

type OnboardingOverrides = Partial<{ primaryGoal: string; trainingExperience: string; workoutDurationMinutes: number; trainingLocation: string; trainingDays: string[]; equipment: string[]; secondaryGoals: string[]; responses: Record<string, unknown> }>;
function onboardingFor(overrides: OnboardingOverrides = {}) {
  return {
    completed: true,
    primaryGoal: overrides.primaryGoal ?? 'Build muscle',
    trainingExperience: overrides.trainingExperience ?? 'INTERMEDIATE',
    workoutDurationMinutes: overrides.workoutDurationMinutes ?? 60,
    trainingLocation: overrides.trainingLocation ?? 'GYM',
    trainingDays: overrides.trainingDays ?? ['Monday', 'Tuesday', 'Thursday', 'Friday'],
    equipment: overrides.equipment ?? ['Everything'],
    secondaryGoals: overrides.secondaryGoals ?? [],
    responses: overrides.responses ?? { primaryGoal: 'build_muscle' },
  };
}

function makePrisma(onboarding: unknown, existingPlan: unknown = null) {
  return {
    onboarding: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(onboarding) },
    workoutPlan: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(existingPlan), create: jest.fn<(args: { data: unknown }) => Promise<unknown>>().mockImplementation(async (args) => ({ id: 'plan-id', ...(args.data as Record<string, unknown>) })) },
    exercise: { findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue(catalogRows) },
    exerciseRelation: { findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue(relationRows) },
    exercisePerformance: { findMany: jest.fn<() => Promise<unknown>>().mockResolvedValue([]) },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;
async function generate(overrides: OnboardingOverrides = {}): Promise<AnyData> {
  const prisma = makePrisma(onboardingFor(overrides));
  const service = new WorkoutPlanService(prisma as never);
  await service.getPlan('user-1');
  return (prisma.workoutPlan.create.mock.calls[0][0] as { data: AnyData }).data;
}
const primaryExercise = (data: AnyData) => data.prescription.sessions.flatMap((session: AnyData) => session.exercises).find((exercise: AnyData) => exercise.role === 'primary' && exercise.reps);

describe('WorkoutPlanService — live generation via the new pipeline', () => {
  it('generates and persists a validated plan with flat rows and a rich prescription', async () => {
    const data = await generate();
    expect(data.goal).toBe('Build muscle');
    expect(data.trainingDays).toHaveLength(4);
    expect(data.days.create).toHaveLength(4);
    const firstDay = data.days.create[0];
    const firstExercise = firstDay.exercises.create[0];
    expect(typeof firstExercise.sets).toBe('number'); // back-compat flat rows
    expect(typeof firstExercise.reps).toBe('string');
    expect(typeof firstExercise.restSeconds).toBe('number');
    expect(typeof firstExercise.exerciseId).toBe('string');
    // Rich prescription persisted (Phase 8 reaches the API response).
    expect(data.prescription.sessions[0].exercises[0]).toHaveProperty('intensity');
    expect(data.prescription.sessions[0].exercises[0].sets).toHaveProperty('min');
    expect(data.prescription.sessions[0].exercises[0].sets).toHaveProperty('max');
  });

  it('reflects different goals in the prescription', async () => {
    const strength = await generate({ primaryGoal: 'Build muscle', responses: { primaryGoal: 'strength' } });
    const fatloss = await generate({ primaryGoal: 'Lose fat', responses: { primaryGoal: 'lose_fat' } });
    expect(primaryExercise(strength).reps.max).toBeLessThanOrEqual(6);
    expect(primaryExercise(fatloss).reps.min).toBeGreaterThanOrEqual(10);
  });

  it('reflects training-day count in the structure', async () => {
    const three = await generate({ trainingDays: ['Monday', 'Wednesday', 'Friday'] });
    const five = await generate({ trainingExperience: 'ADVANCED', trainingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], responses: { primaryGoal: 'build_muscle' } });
    expect(three.days.create).toHaveLength(3);
    expect(five.days.create).toHaveLength(5);
    expect(three.prescription.archetype).not.toBe(five.prescription.archetype);
  });

  it('reflects workout duration in the final workout', async () => {
    const short = await generate({ workoutDurationMinutes: 30 });
    const long = await generate({ workoutDurationMinutes: 90 });
    const sets = (data: AnyData) => data.days.create.reduce((sum: number, day: AnyData) => sum + day.exercises.create.length, 0);
    expect(sets(short)).toBeLessThanOrEqual(sets(long));
    for (const session of short.prescription.sessions) expect(session.committedMinutes).toBeLessThanOrEqual(30);
  });

  it('changes exercise selection when equipment changes', async () => {
    const gym = await generate();
    const dumbbells = await generate({ trainingLocation: 'HOME', equipment: ['Dumbbells'] });
    const slugs = (data: AnyData) => data.days.create.flatMap((day: AnyData) => day.exercises.create.map((exercise: AnyData) => exercise.exerciseId));
    expect(slugs(gym)).not.toEqual(slugs(dumbbells));
    const dumbbellRows = new Map(catalogRows.map((row) => [row.slug, row.equipment]));
    for (const slug of slugs(dumbbells)) expect((dumbbellRows.get(slug) ?? []).every((item) => item === 'Dumbbells')).toBe(true);
  });

  it('respects reported health constraints in the persisted workout', async () => {
    const data = await generate({ responses: { primaryGoal: 'build_muscle', injuryAreas: ['knee'] } });
    for (const slug of data.days.create.flatMap((day: AnyData) => day.exercises.create.map((exercise: AnyData) => exercise.exerciseId))) {
      const kneeLoad = (constraintsBySlug.get(slug) ?? []).some((constraint) => constraint.area === 'knee' && (constraint.severity === 'moderate' || constraint.severity === 'high'));
      expect(kneeLoad).toBe(false);
    }
  });

  it('runs time/volume validation so every persisted session fits the budget', async () => {
    const data = await generate({ workoutDurationMinutes: 45 });
    for (const session of data.prescription.sessions) {
      expect(session.withinBudget).toBe(true);
      expect(session.committedMinutes).toBeLessThanOrEqual(45);
      expect(Array.isArray(session.findings)).toBe(true);
    }
  });

  it('returns the cached plan without regenerating when the fingerprint matches', async () => {
    const prisma = makePrisma(onboardingFor(), { id: 'cached-plan', days: [] });
    const service = new WorkoutPlanService(prisma as never);
    const result = await service.getPlan('user-1') as { id: string };
    expect(result.id).toBe('cached-plan');
    expect(prisma.workoutPlan.create).not.toHaveBeenCalled();
  });

  it('throws when the training profile is incomplete rather than inventing data', async () => {
    const prisma = makePrisma({ completed: true, primaryGoal: null, trainingExperience: null, workoutDurationMinutes: null, trainingLocation: null, trainingDays: [], equipment: [], secondaryGoals: [], responses: {} });
    const service = new WorkoutPlanService(prisma as never);
    await expect(service.getPlan('user-1')).rejects.toThrow('incomplete');
  });
});
