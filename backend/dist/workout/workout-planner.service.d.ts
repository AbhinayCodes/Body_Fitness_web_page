import type { CatalogExercise, GeneratedWorkoutPlan, WorkoutPlanningInput } from './workout-planner.types';
export declare class WorkoutPlannerService {
    fingerprint(input: WorkoutPlanningInput): string;
    generate(input: WorkoutPlanningInput, catalog: CatalogExercise[]): GeneratedWorkoutPlan;
    private isAvailable;
    private validate;
}
export declare class WorkoutPlanningError extends Error {
}
