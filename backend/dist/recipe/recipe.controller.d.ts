import { ListRecipesDto } from './dto/list-recipes.dto';
import { RecipeServingsDto } from './dto/recipe-servings.dto';
import { RecipeService } from './recipe.service';
export declare class RecipeController {
    private readonly recipeService;
    constructor(recipeService: RecipeService);
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
    getBySlug(slug: string, query: RecipeServingsDto): Promise<{
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
}
