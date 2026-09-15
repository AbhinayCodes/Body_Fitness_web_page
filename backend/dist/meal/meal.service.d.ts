import { FitnessStateRepository } from '../data-access/fitness-state.repository';
import type { MealHistoryEntry } from '../data-access/fitness-state.types';
import type { CreateMealDto } from './dto/create-meal.dto';
export declare class MealService {
    private readonly repository;
    constructor(repository: FitnessStateRepository);
    createMeal(payload: CreateMealDto): Promise<MealHistoryEntry>;
}
