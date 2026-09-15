import { NutritionService } from './nutrition.service';
export declare class NutritionController {
    private readonly nutritionService;
    constructor(nutritionService: NutritionService);
    getTargets(userId: string): Promise<import("./nutrition-calculation.types").CalculationResult>;
}
