export declare enum RecipeDietFilter {
    VEGETARIAN = "VEGETARIAN",
    NON_VEGETARIAN = "NON_VEGETARIAN",
    VEGAN = "VEGAN"
}
export declare enum RecipeMealCategoryFilter {
    BREAKFAST = "BREAKFAST",
    LUNCH = "LUNCH",
    SNACK = "SNACK",
    DINNER = "DINNER",
    PRE_WORKOUT = "PRE_WORKOUT",
    POST_WORKOUT = "POST_WORKOUT"
}
export declare class ListRecipesDto {
    dietType?: RecipeDietFilter;
    mealCategory?: RecipeMealCategoryFilter;
    restrictions?: string[];
    servings?: number;
}
