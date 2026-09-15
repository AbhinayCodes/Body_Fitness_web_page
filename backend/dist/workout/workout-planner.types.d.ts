export interface WorkoutPlanningInput {
    primaryGoal: 'Build muscle' | 'Lose fat' | 'Maintain fitness';
    trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    trainingDays: string[];
    workoutDurationMinutes: 30 | 45 | 60 | 90;
    trainingLocation: 'HOME' | 'GYM' | 'OUTDOOR' | 'MIXED';
    equipment: string[];
}
export interface CatalogExercise {
    id: string;
    slug: string;
    name: string;
    muscleGroups: string[];
    movementPattern: string;
    equipment: string[];
    locations: string[];
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    suitableGoals: string[];
    instructions: string[];
    estimatedMinutes: number;
}
export interface GeneratedWorkoutDay {
    weekday: string;
    title: string;
    targetMuscleGroups: string[];
    estimatedMinutes: number;
    exercises: Array<{
        exerciseId: string;
        exerciseOrder: number;
        sets: number;
        reps: string;
        restSeconds: number;
        instructions: string[];
    }>;
}
export interface GeneratedWorkoutPlan {
    goal: string;
    experience: string;
    durationMinutes: number;
    trainingLocation: string;
    trainingDays: string[];
    days: GeneratedWorkoutDay[];
}
