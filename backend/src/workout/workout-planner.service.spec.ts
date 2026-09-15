import { describe, expect, it } from '@jest/globals';
import { WorkoutPlannerService, WorkoutPlanningError } from './workout-planner.service';
import type { CatalogExercise, WorkoutPlanningInput } from './workout-planner.types';

const planner = new WorkoutPlannerService();
const patterns = ['squat', 'horizontal-push', 'horizontal-pull', 'hip-hinge', 'core', 'conditioning'];
const catalog: CatalogExercise[] = patterns.flatMap((movementPattern, index) => [
  { id: `body-${movementPattern}`, slug: `body-${movementPattern}`, name: `Body ${movementPattern}`, muscleGroups: [movementPattern], movementPattern, equipment: [], locations: ['HOME', 'GYM', 'OUTDOOR', 'MIXED'], difficulty: 'BEGINNER', suitableGoals: ['Build muscle', 'Lose fat', 'Maintain fitness'], instructions: ['Use controlled form.'], estimatedMinutes: 6 },
  { id: `db-${movementPattern}`, slug: `db-${movementPattern}`, name: `Dumbbell ${movementPattern}`, muscleGroups: [movementPattern], movementPattern, equipment: ['Dumbbells'], locations: ['HOME', 'GYM', 'MIXED'], difficulty: index % 2 ? 'INTERMEDIATE' : 'BEGINNER', suitableGoals: ['Build muscle', 'Lose fat', 'Maintain fitness'], instructions: ['Use controlled form.'], estimatedMinutes: 8 },
  { id: `bar-${movementPattern}`, slug: `bar-${movementPattern}`, name: `Barbell ${movementPattern}`, muscleGroups: [movementPattern], movementPattern, equipment: ['Barbell'], locations: ['GYM'], difficulty: 'ADVANCED', suitableGoals: ['Build muscle', 'Lose fat', 'Maintain fitness'], instructions: ['Use controlled form.'], estimatedMinutes: 9 },
]);
const base: WorkoutPlanningInput = { primaryGoal: 'Build muscle', trainingExperience: 'BEGINNER', trainingDays: ['Monday', 'Wednesday', 'Friday'], workoutDurationMinutes: 45, trainingLocation: 'HOME', equipment: [] };

describe('WorkoutPlannerService', () => {
  it.each([1, 2, 3, 4, 5, 6, 7])('generates deterministic plans for %i selected days', (count) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, count);
    const first = planner.generate({ ...base, trainingDays: days }, catalog);
    const second = planner.generate({ ...base, trainingDays: days }, catalog);
    expect(first).toEqual(second);
    expect(first.days.map((day) => day.weekday)).toEqual(days);
  });

  it.each([30, 45, 60, 90] as const)('respects the %i-minute session exercise budget', (workoutDurationMinutes) => {
    const plan = planner.generate({ ...base, workoutDurationMinutes }, catalog);
    expect(plan.days.every((day) => day.exercises.length === ({ 30: 3, 45: 4, 60: 5, 90: 6 } as const)[workoutDurationMinutes])).toBe(true);
    expect(plan.days.every((day) => day.estimatedMinutes <= workoutDurationMinutes)).toBe(true);
  });

  it('never uses unavailable gym or barbell exercises for a dumbbell-only home user', () => {
    const plan = planner.generate({ ...base, equipment: ['Dumbbells'] }, catalog);
    const names = plan.days.flatMap((day) => day.exercises.map((exercise) => catalog.find((item) => item.id === exercise.exerciseId)!.name));
    expect(names.every((name) => !name.startsWith('Barbell'))).toBe(true);
  });

  it('uses only bodyweight-compatible exercises when no equipment is available', () => {
    const plan = planner.generate({ ...base, trainingLocation: 'OUTDOOR', equipment: [] }, catalog);
    expect(plan.days.flatMap((day) => day.exercises).every((exercise) => catalog.find((item) => item.id === exercise.exerciseId)!.equipment.length === 0)).toBe(true);
  });

  it.each(['Build muscle', 'Lose fat', 'Maintain fitness'] as const)('supports the %s goal', (primaryGoal) => {
    const plan = planner.generate({ ...base, primaryGoal }, catalog);
    expect(plan.goal).toBe(primaryGoal);
    expect(plan.days[0].exercises.length).toBeGreaterThan(0);
  });

  it.each(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const)('adjusts set count for %s experience', (trainingExperience) => {
    const plan = planner.generate({ ...base, trainingExperience, equipment: ['Dumbbells', 'Barbell'], trainingLocation: 'GYM' }, catalog);
    expect(plan.days[0].exercises[0].sets).toBe(trainingExperience === 'BEGINNER' ? 2 : trainingExperience === 'INTERMEDIATE' ? 3 : 4);
  });

  it('rejects invalid frequency, duration, and incompatible catalog combinations', () => {
    expect(() => planner.generate({ ...base, trainingDays: [] }, catalog)).toThrow(WorkoutPlanningError);
    expect(() => planner.generate({ ...base, workoutDurationMinutes: 40 as 45 }, catalog)).toThrow('Workout duration must be 30, 45, 60, or 90 minutes.');
    expect(() => planner.generate({ ...base, trainingLocation: 'OUTDOOR', equipment: ['Barbell'] }, catalog.filter((exercise) => exercise.equipment.includes('Barbell')))).toThrow('No catalog exercises match');
  });
});