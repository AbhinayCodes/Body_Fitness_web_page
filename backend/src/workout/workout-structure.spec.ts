import { describe, expect, it } from '@jest/globals';
import { getExerciseCandidates, type CandidateQuery, type RelationEdge } from './exercise-candidates';
import { chooseArchetype, generateWeeklyStructure, type StructureContext } from './workout-structure';
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
const GYM = ['Dumbbells', 'Barbell', 'Cable', 'Machines', 'Resistance bands', 'Kettlebell', 'Pull-up bar', 'Bench', 'Cardio machine'];
const DAYS3 = ['Monday', 'Wednesday', 'Friday'];
const DAYS5 = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function candidatesFor(partial: Partial<CandidateQuery>) {
  const query: CandidateQuery = { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingLocation: 'GYM', equipment: GYM, ...partial };
  return getExerciseCandidates(catalog, relations, query);
}
function context(partial: Partial<StructureContext>): StructureContext {
  return { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingDays: DAYS3, workoutDurationMinutes: 45, ...partial };
}

describe('chooseArchetype — structure depends on context, not day-count alone', () => {
  it('picks different structures for the same five days based on experience and goal', () => {
    expect(chooseArchetype(context({ trainingExperience: 'BEGINNER', trainingDays: DAYS5, richGoal: 'build_muscle' })).id).toBe('full-body');
    expect(chooseArchetype(context({ trainingExperience: 'INTERMEDIATE', trainingDays: DAYS5, richGoal: 'build_muscle' })).id).toBe('upper-lower');
    expect(chooseArchetype(context({ trainingExperience: 'ADVANCED', trainingDays: DAYS5, richGoal: 'build_muscle' })).id).toBe('push-pull-legs');
  });

  it('chooses goal-driven structures regardless of day count', () => {
    expect(chooseArchetype(context({ trainingDays: DAYS5, primaryGoal: 'Lose fat', richGoal: 'lose_fat' })).id).toBe('full-body-conditioning');
    expect(chooseArchetype(context({ trainingDays: DAYS5, richGoal: 'endurance' })).id).toBe('full-body-conditioning');
    expect(chooseArchetype(context({ trainingExperience: 'INTERMEDIATE', trainingDays: ['Mon', 'Tue', 'Wed', 'Thu'], richGoal: 'strength' })).id).toBe('upper-lower-strength');
    expect(chooseArchetype(context({ trainingExperience: 'INTERMEDIATE', trainingDays: DAYS3, richGoal: 'strength' })).id).toBe('full-body-strength');
  });

  it('eases back with full-body when deloading and stays gentle when clearance is required', () => {
    expect(chooseArchetype(context({ trainingExperience: 'ADVANCED', trainingDays: DAYS5, recovery: { deload: true } })).id).toBe('full-body');
    expect(chooseArchetype(context({ requiresGentle: true })).id).toBe('gentle-movement');
  });

  it('applies specialization when priority muscles are provided', () => {
    expect(chooseArchetype(context({ trainingExperience: 'BEGINNER', priorityMuscles: ['chest'] })).id).toBe('full-body-specialization');
  });
});

describe('generateWeeklyStructure — session assembly', () => {
  it('matches the user\'s available days and orders exercises without sets/reps', () => {
    const structure = generateWeeklyStructure(candidatesFor({ trainingExperience: 'INTERMEDIATE' }).candidates, context({ trainingExperience: 'INTERMEDIATE', trainingDays: DAYS5 }));
    expect(structure.days.map((day) => day.weekday)).toEqual(DAYS5);
    for (const day of structure.days) {
      expect(day.exercises.map((exercise) => exercise.order)).toEqual(day.exercises.map((_, index) => index));
      for (const exercise of day.exercises) {
        expect(exercise).not.toHaveProperty('sets');
        expect(exercise).not.toHaveProperty('reps');
      }
      expect(day.movementRequirements.length).toBeGreaterThan(0);
    }
  });

  it('respects the workout duration budget', () => {
    for (const duration of [30, 45, 90] as const) {
      const structure = generateWeeklyStructure(candidatesFor({ trainingExperience: 'INTERMEDIATE' }).candidates, context({ trainingExperience: 'INTERMEDIATE', trainingDays: DAYS5, workoutDurationMinutes: duration }));
      for (const day of structure.days) expect(day.estimatedMinutes).toBeLessThanOrEqual(duration);
    }
  });

  it('produces different weekly structures for different users', () => {
    const beginnerHome = generateWeeklyStructure(candidatesFor({ trainingExperience: 'BEGINNER', trainingLocation: 'HOME', equipment: ['Dumbbells'] }).candidates, context({ trainingExperience: 'BEGINNER', trainingDays: DAYS5 }));
    const advancedGym = generateWeeklyStructure(candidatesFor({ trainingExperience: 'ADVANCED' }).candidates, context({ trainingExperience: 'ADVANCED', trainingDays: DAYS5 }));
    expect(beginnerHome.archetype).not.toEqual(advancedGym.archetype);
  });

  it('is deterministic for identical input', () => {
    const candidates = candidatesFor({ trainingExperience: 'INTERMEDIATE' }).candidates;
    const ctx = context({ trainingExperience: 'INTERMEDIATE', trainingDays: DAYS5 });
    expect(generateWeeklyStructure(candidates, ctx)).toEqual(generateWeeklyStructure(candidates, ctx));
  });

  it('builds a conditioning-oriented structure for fat loss', () => {
    const structure = generateWeeklyStructure(candidatesFor({ primaryGoal: 'Lose fat', richGoal: 'lose_fat', trainingExperience: 'INTERMEDIATE' }).candidates, context({ primaryGoal: 'Lose fat', richGoal: 'lose_fat', trainingExperience: 'INTERMEDIATE', trainingDays: DAYS3 }));
    expect(structure.archetype).toBe('full-body-conditioning');
    const hasConditioning = structure.days.some((day) => day.exercises.some((exercise) => exercise.movementPattern === 'conditioning'));
    expect(hasConditioning).toBe(true);
  });
});

describe('generateWeeklyStructure — health and equipment context', () => {
  it('never includes moderate/high knee-load exercises for a reported knee issue', () => {
    const structure = generateWeeklyStructure(candidatesFor({ trainingExperience: 'INTERMEDIATE', health: { injuryAreas: ['knee'] } }).candidates, context({ trainingExperience: 'INTERMEDIATE', trainingDays: DAYS3, health: undefined }));
    for (const day of structure.days) {
      for (const exercise of day.exercises) {
        const kneeLoad = (bySlug.get(exercise.slug)!.constraints ?? []).some((constraint) => constraint.area === 'knee' && (constraint.severity === 'moderate' || constraint.severity === 'high'));
        expect(kneeLoad).toBe(false);
      }
    }
  });

  it('only uses equipment the user actually has', () => {
    const structure = generateWeeklyStructure(candidatesFor({ trainingExperience: 'INTERMEDIATE', trainingLocation: 'HOME', equipment: ['Dumbbells'] }).candidates, context({ trainingExperience: 'INTERMEDIATE', trainingDays: DAYS3 }));
    for (const day of structure.days) for (const exercise of day.exercises) expect(bySlug.get(exercise.slug)!.equipment.every((item) => item === 'Dumbbells')).toBe(true);
  });

  it('produces a gentle structure when medical clearance is required', () => {
    const pool = candidatesFor({ health: { doctorExerciseRestriction: true } });
    const structure = generateWeeklyStructure(pool.candidates, context({ requiresGentle: true, trainingDays: DAYS3 }));
    expect(structure.archetype).toBe('gentle-movement');
    for (const day of structure.days) for (const exercise of day.exercises) expect(['mobility', 'cardio']).toContain(bySlug.get(exercise.slug)!.category);
  });
});
