import { FitnessRepository } from '../data-access/fitness.repository';
import type { MealHistoryEntry } from '../data-access/fitness-state.types';
import type { CreateMealDto } from './dto/create-meal.dto';
export declare class MealService {
    private readonly repository;
    constructor(repository: FitnessRepository);
    createMeal(userId: string, payload: CreateMealDto): Promise<MealHistoryEntry>;
}
