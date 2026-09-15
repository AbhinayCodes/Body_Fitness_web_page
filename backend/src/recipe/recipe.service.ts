import { Injectable, NotFoundException } from '@nestjs/common';
import { RecipeRepository } from './recipe.repository';
import type { ListRecipesDto } from './dto/list-recipes.dto';

type RecipeRecord = Awaited<ReturnType<RecipeRepository['findBySlug']>>;

@Injectable()
export class RecipeService {
  constructor(private readonly repository: RecipeRepository) {}

  async list(filters: ListRecipesDto) {
    const recipes = await this.repository.findMany(filters);
    return recipes.map((recipe) => this.present(recipe, filters.servings ?? 1));
  }

  async getBySlug(slug: string, servings = 1) {
    const recipe = await this.repository.findBySlug(slug);
    if (!recipe) throw new NotFoundException('Recipe not found.');
    return this.present(recipe, servings);
  }

  private present(recipe: NonNullable<RecipeRecord>, servings: number) {
    const scale = (value: number | { toString(): string }) => Math.round(Number(value) * servings * 10) / 10;
    return {
      id: recipe.id,
      slug: recipe.slug,
      name: recipe.name,
      mealCategory: recipe.mealCategory,
      dietType: recipe.dietType,
      regionalCuisines: recipe.regionalCuisines,
      preparationMinutes: recipe.preparationMinutes,
      serving: { description: recipe.servingDescription, grams: recipe.servingGrams, count: servings },
      nutrition: { calories: Math.round(recipe.calories * servings), proteinGrams: scale(recipe.proteinGrams), carbohydrateGrams: scale(recipe.carbohydrateGrams), fatGrams: scale(recipe.fatGrams), fiberGrams: scale(recipe.fiberGrams), estimated: true, note: recipe.nutritionBasis },
      allergens: recipe.allergens,
      tags: recipe.tags,
      preparationSteps: recipe.preparationSteps,
      ingredients: recipe.ingredients.map(({ quantity, unit, ingredient }) => ({ name: ingredient.name, quantity: scale(quantity), unit })),
    };
  }
}