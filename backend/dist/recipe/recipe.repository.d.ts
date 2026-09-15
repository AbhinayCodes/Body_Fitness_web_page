import type { Prisma, RecipeDietType, RecipeMealCategory } from '@prisma/client';
import { PrismaService } from '../data-access/prisma.service';
export interface RecipeFilters {
    dietType?: RecipeDietType;
    mealCategory?: RecipeMealCategory;
    restrictions?: string[];
}
export declare class RecipeRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findMany(filters: RecipeFilters): Prisma.PrismaPromise<({
        ingredients: ({
            ingredient: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                standardUnit: string;
                caloriesPer100g: Prisma.Decimal | null;
                proteinGramsPer100g: Prisma.Decimal | null;
                carbohydrateGramsPer100g: Prisma.Decimal | null;
                fatGramsPer100g: Prisma.Decimal | null;
                fiberGramsPer100g: Prisma.Decimal | null;
                nutritionSource: string | null;
            };
        } & {
            recipeId: string;
            ingredientId: string;
            quantity: Prisma.Decimal;
            unit: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        dietType: import("@prisma/client").$Enums.RecipeDietType;
        slug: string;
        mealCategory: import("@prisma/client").$Enums.RecipeMealCategory;
        regionalCuisines: string[];
        preparationMinutes: number;
        servingDescription: string;
        servingGrams: number | null;
        calories: number;
        proteinGrams: Prisma.Decimal;
        carbohydrateGrams: Prisma.Decimal;
        fatGrams: Prisma.Decimal;
        fiberGrams: Prisma.Decimal;
        allergens: string[];
        tags: string[];
        preparationSteps: string[];
        nutritionBasis: string;
    })[]>;
    findBySlug(slug: string): Prisma.Prisma__RecipeClient<({
        ingredients: ({
            ingredient: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                standardUnit: string;
                caloriesPer100g: Prisma.Decimal | null;
                proteinGramsPer100g: Prisma.Decimal | null;
                carbohydrateGramsPer100g: Prisma.Decimal | null;
                fatGramsPer100g: Prisma.Decimal | null;
                fiberGramsPer100g: Prisma.Decimal | null;
                nutritionSource: string | null;
            };
        } & {
            recipeId: string;
            ingredientId: string;
            quantity: Prisma.Decimal;
            unit: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        dietType: import("@prisma/client").$Enums.RecipeDietType;
        slug: string;
        mealCategory: import("@prisma/client").$Enums.RecipeMealCategory;
        regionalCuisines: string[];
        preparationMinutes: number;
        servingDescription: string;
        servingGrams: number | null;
        calories: number;
        proteinGrams: Prisma.Decimal;
        carbohydrateGrams: Prisma.Decimal;
        fatGrams: Prisma.Decimal;
        fiberGrams: Prisma.Decimal;
        allergens: string[];
        tags: string[];
        preparationSteps: string[];
        nutritionBasis: string;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
}
