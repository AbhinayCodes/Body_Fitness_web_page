import { FitnessStateRepository } from '../data-access/fitness-state.repository';
import type { WorkoutHistoryEntry } from '../data-access/fitness-state.types';
import type { CreateWorkoutDto } from './dto/create-workout.dto';
export declare class WorkoutService {
    private readonly repository;
    constructor(repository: FitnessStateRepository);
    createWorkout(payload: CreateWorkoutDto): Promise<WorkoutHistoryEntry>;
}
