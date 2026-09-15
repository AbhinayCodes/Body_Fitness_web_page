declare class ExerciseProgressDto {
    exerciseIndex: number;
    setsCompleted: number;
}
export declare class UpdateWorkoutProgressDto {
    workoutPlanDayId: string;
    exercises: ExerciseProgressDto[];
}
export {};
