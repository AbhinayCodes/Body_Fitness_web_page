import { describe, expect, it, jest } from '@jest/globals';
import { RecipeService } from './recipe.service';

const recipe = {
  id: 'recipe-id', slug: 'paneer-bhurji-roti', name: 'Paneer Bhurji with Roti', mealCategory: 'DINNER', dietType: 'VEGETARIAN', regionalCuisines: ['North Indian'], preparationMinutes: 25, servingDescription: 'Paneer bhurji with 2 roti', servingGrams: 360, calories: 530, proteinGrams: 30, carbohydrateGrams: 54, fatGrams: 24, fiberGrams: 9, allergens: ['DAIRY', 'GLUTEN'], tags: ['high-protein'], preparationSteps: ['Cook'], nutritionBasis: 'Estimated source data', ingredients: [{ quantity: 140, unit: 'g', ingredient: { name: 'Paneer' }}],
};

describe('RecipeService', () => {
  it('retrieves recipes and applies diet and restriction filters through the repository', async () => {
    const repository = { findMany: jest.fn().mockResolvedValue([recipe]), findBySlug: jest.fn() };
    const service = new RecipeService(repository as never);
    const filters = { dietType: 'VEGETARIAN' as const, restrictions: ['EGG'], servings: 1 };
    await expect(service.list(filters)).resolves.toHaveLength(1);
    expect(repository.findMany).toHaveBeenCalledWith(filters);
  });

  it('scales serving size and all stored nutrition values deterministically', async () => {
    const repository = { findMany: jest.fn(), findBySlug: jest.fn().mockResolvedValue(recipe) };
    const service = new RecipeService(repository as never);
    await expect(service.getBySlug(recipe.slug, 2)).resolves.toMatchObject({ serving: { count: 2, grams: 360 }, nutrition: { calories: 1060, proteinGrams: 60, carbohydrateGrams: 108, fatGrams: 48, fiberGrams: 18, estimated: true }, ingredients: [{ name: 'Paneer', quantity: 280, unit: 'g' }] });
  });
});