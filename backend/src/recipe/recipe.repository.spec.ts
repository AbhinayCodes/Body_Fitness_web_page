import { describe, expect, it, jest } from '@jest/globals';
import { RecipeRepository } from './recipe.repository';

describe('RecipeRepository', () => {
  it('uses indexed diet/category filters and excludes every requested allergen', async () => {
    const prisma = { recipe: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() } };
    const repository = new RecipeRepository(prisma as never);
    await repository.findMany({ dietType: 'VEGAN', mealCategory: 'BREAKFAST', restrictions: ['DAIRY', 'PEANUT'] });
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { dietType: 'VEGAN', mealCategory: 'BREAKFAST', NOT: [{ allergens: { has: 'DAIRY' } }, { allergens: { has: 'PEANUT' } }] } }));
  });
});