export interface Profile {
    name: string;
    goal: string;
    days: string;
    diet: string;
}
export interface WorkoutHistoryEntry {
    date: string;
    exercises: number[];
    durationMinutes: number;
}
export interface MealHistoryEntry {
    date: string;
    meal: string;
}
export interface FitnessState {
    profile: Profile;
    mealDone: boolean;
    workoutHistory: WorkoutHistoryEntry[];
    mealHistory: MealHistoryEntry[];
}
export declare const DEFAULT_STATE: FitnessState;
