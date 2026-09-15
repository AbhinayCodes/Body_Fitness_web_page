import { RecipeRepository } from './recipe.repository';
import type { ListRecipesDto } from './dto/list-recipes.dto';
export declare class RecipeService {
    private readonly repository;
    constructor(repository: RecipeRepository);
    list(filters: ListRecipesDto): Promise<{
        id: string;
        slug: string;
        name: string;
        mealCategory: import("@prisma/client").$Enums.RecipeMealCategory;
        dietType: import("@prisma/client").$Enums.RecipeDietType;
        regionalCuisines: string[];
        preparationMinutes: number;
        serving: {
            description: string;
            grams: number | null;
            count: number;
        };
        nutrition: {
            calories: number;
            proteinGrams: number;
            carbohydrateGrams: number;
            fatGrams: number;
            fiberGrams: number;
            estimated: boolean;
            note: string;
        };
        allergens: string[];
        tags: string[];
        preparationSteps: string[];
        ingredients: {
            name: string;
            quantity: number;
            unit: string;
        }[];
    }[]>;
    getBySlug(slug: string, servings?: number): Promise<{
        id: string;
        slug: string;
        name: string;
        mealCategory: import("@prisma/client").$Enums.RecipeMealCategory;
        dietType: import("@prisma/client").$Enums.RecipeDietType;
        regionalCuisines: string[];
        preparationMinutes: number;
        serving: {
            description: string;
            grams: number | null;
            count: number;
        };
        nutrition: {
            calories: number;
            proteinGrams: number;
            carbohydrateGrams: number;
            fatGrams: number;
            fiberGrams: number;
            estimated: boolean;
            note: string;
        };
        allergens: string[];
        tags: string[];
        preparationSteps: string[];
        ingredients: {
            name: string;
            quantity: number;
            unit: string;
        }[];
    }>;
    private present;
}
