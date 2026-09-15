import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { CatalogExercise, GeneratedWorkoutPlan, WorkoutPlanningInput } from './workout-planner.types';

const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const patternsBySplit: Record<string, string[]> = { Full: ['squat', 'horizontal-push', 'horizontal-pull', 'hip-hinge', 'core', 'conditioning'], Upper: ['horizontal-push', 'horizontal-pull', 'vertical-push', 'vertical-pull', 'core'], Lower: ['squat', 'hip-hinge', 'single-leg', 'core', 'conditioning'], Push: ['horizontal-push', 'vertical-push', 'core'], Pull: ['horizontal-pull', 'vertical-pull', 'core'], Legs: ['squat', 'hip-hinge', 'single-leg', 'core'] };

@Injectable()
export class WorkoutPlannerService {
  fingerprint(input: WorkoutPlanningInput): string { return createHash('sha256').update(JSON.stringify({ ...input, trainingDays: [...input.trainingDays].sort(), equipment: [...input.equipment].sort() })).digest('hex'); }

  generate(input: WorkoutPlanningInput, catalog: CatalogExercise[]): GeneratedWorkoutPlan {
    this.validate(input);
    const sortedDays = [...input.trainingDays].sort((left, right) => weekdayOrder.indexOf(left) - weekdayOrder.indexOf(right));
    const splits = splitForFrequency(sortedDays.length);
    const exerciseCount = ({ 30: 3, 45: 4, 60: 5, 90: 6 } as const)[input.workoutDurationMinutes];
    const available = catalog.filter((exercise) => this.isAvailable(exercise, input));
    if (!available.length) throw new WorkoutPlanningError('No catalog exercises match this location and equipment.');
    return { goal: input.primaryGoal, experience: input.trainingExperience, durationMinutes: input.workoutDurationMinutes, trainingLocation: input.trainingLocation, trainingDays: sortedDays, days: sortedDays.map((weekday, index) => {
      const split = splits[index % splits.length];
      const selected = patternsBySplit[split].map((pattern) => available.find((exercise) => exercise.movementPattern === pattern)).filter((exercise): exercise is CatalogExercise => Boolean(exercise)).slice(0, exerciseCount);
      const fallback = available.filter((exercise) => !selected.some((item) => item.id === exercise.id));
      while (selected.length < exerciseCount && fallback.length) selected.push(fallback.shift()!);
      if (selected.length < exerciseCount) throw new WorkoutPlanningError(`Not enough compatible exercises for a ${input.workoutDurationMinutes}-minute ${split.toLowerCase()} session.`);
      const isConditioning = input.primaryGoal === 'Lose fat';
      const sets = input.trainingExperience === 'BEGINNER' ? 2 : input.trainingExperience === 'ADVANCED' ? 4 : 3;
      return { weekday, title: `${split} ${isConditioning ? 'conditioning' : 'strength'}`, targetMuscleGroups: [...new Set(selected.flatMap((exercise) => exercise.muscleGroups))], estimatedMinutes: Math.min(input.workoutDurationMinutes, selected.reduce((sum, exercise) => sum + exercise.estimatedMinutes, 0)), exercises: selected.map((exercise, exerciseOrder) => ({ exerciseId: exercise.id, exerciseOrder, sets, reps: exercise.movementPattern === 'core' ? '30-45 sec' : isConditioning && exercise.movementPattern === 'conditioning' ? '8 min intervals' : input.primaryGoal === 'Build muscle' ? '8-12' : '10-15', restSeconds: input.primaryGoal === 'Lose fat' ? 45 : input.trainingExperience === 'ADVANCED' ? 90 : 60, instructions: exercise.instructions })) };
    }) };
  }

  private isAvailable(exercise: CatalogExercise, input: WorkoutPlanningInput): boolean {
    const difficulties = input.trainingExperience === 'BEGINNER' ? ['BEGINNER'] : input.trainingExperience === 'INTERMEDIATE' ? ['BEGINNER', 'INTERMEDIATE'] : ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    return difficulties.includes(exercise.difficulty) && exercise.locations.includes(input.trainingLocation) && exercise.equipment.every((item) => input.equipment.includes(item)) && exercise.suitableGoals.includes(input.primaryGoal);
  }
  private validate(input: WorkoutPlanningInput): void { if (input.trainingDays.length < 1 || input.trainingDays.length > 7) throw new WorkoutPlanningError('Choose between 1 and 7 training days.'); if (![30, 45, 60, 90].includes(input.workoutDurationMinutes)) throw new WorkoutPlanningError('Workout duration must be 30, 45, 60, or 90 minutes.'); }
}

export class WorkoutPlanningError extends Error {}

function splitForFrequency(frequency: number): string[] { if (frequency <= 3) return ['Full']; if (frequency === 4) return ['Upper', 'Lower']; if (frequency === 5) return ['Push', 'Pull', 'Legs', 'Upper', 'Lower']; if (frequency === 6) return ['Push', 'Pull', 'Legs']; return ['Full', 'Upper', 'Lower']; }