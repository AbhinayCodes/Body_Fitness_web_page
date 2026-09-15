import { CreateMealDto } from './dto/create-meal.dto';
import { MealService } from './meal.service';
export declare class MealController {
    private readonly mealService;
    constructor(mealService: MealService);
    createMeal(userId: string, payload: CreateMealDto): Promise<import("../data-access/fitness-state.types").MealHistoryEntry>;
}
