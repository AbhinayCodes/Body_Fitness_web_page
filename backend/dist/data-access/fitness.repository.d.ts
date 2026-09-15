import type { CreateMealDto } from '../meal/dto/create-meal.dto';
import type { UpdateProfileDto } from '../profile/dto/update-profile.dto';
import type { CreateWorkoutDto } from '../workout/dto/create-workout.dto';
import { type FitnessState, type MealHistoryEntry, type Profile, type WorkoutHistoryEntry } from './fitness-state.types';
import { PrismaService } from './prisma.service';
export declare class FitnessRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getState(userId: string): Promise<FitnessState>;
    updateProfile(userId: string, payload: UpdateProfileDto): Promise<Profile>;
    createWorkout(userId: string, payload: CreateWorkoutDto): Promise<WorkoutHistoryEntry>;
    createMeal(userId: string, payload: CreateMealDto): Promise<MealHistoryEntry>;
    private getUser;
    private toProfile;
    private toDateString;
}
