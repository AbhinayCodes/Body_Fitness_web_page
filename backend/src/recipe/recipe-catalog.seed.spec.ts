import { describe, expect, it, jest } from '@jest/globals';
import { seedRecipeCatalog } from '../../prisma/recipe-catalog.seed';

describe('recipe catalog seed', () => {
  it('upserts a deliberately small catalog with linked ingredients', async () => {
    const prisma = { ingredient: { upsert: jest.fn().mockResolvedValue({}) }, recipe: { upsert: jest.fn().mockResolvedValue({}) } };
    await seedRecipeCatalog(prisma as never);
    expect(prisma.ingredient.upsert).toHaveBeenCalledTimes(24);
    expect(prisma.recipe.upsert).toHaveBeenCalledTimes(12);
    expect(prisma.recipe.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ ingredients: expect.objectContaining({ create: expect.any(Array) }) }) }));
  });
});