import { PrismaService } from '../data-access/prisma.service';
import { NutritionCalculationService } from './nutrition-calculation.service';
export declare class NutritionService {
    private readonly prisma;
    private readonly calculator;
    constructor(prisma: PrismaService, calculator: NutritionCalculationService);
    getTargets(userId: string): Promise<import("./nutrition-calculation.types").CalculationResult>;
}
