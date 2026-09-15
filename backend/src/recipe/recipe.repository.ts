import { Injectable } from '@nestjs/common';
import type { Prisma, RecipeDietType, RecipeMealCategory } from '@prisma/client';
import { PrismaService } from '../data-access/prisma.service';

export interface RecipeFilters { dietType?: RecipeDietType; mealCategory?: RecipeMealCategory; restrictions?: string[]; }

@Injectable()
export class RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(filters: RecipeFilters) {
    const where: Prisma.RecipeWhereInput = {
      ...(filters.dietType ? { dietType: filters.dietType } : {}),
      ...(filters.mealCategory ? { mealCategory: filters.mealCategory } : {}),
      ...(filters.restrictions?.length ? { NOT: filters.restrictions.map((allergen) => ({ allergens: { has: allergen } })) } : {}),
    };
    return this.prisma.recipe.findMany({ where, orderBy: { name: 'asc' }, include: { ingredients: { include: { ingredient: true } } } });
  }

  findBySlug(slug: string) {
    return this.prisma.recipe.findUnique({ where: { slug }, include: { ingredients: { include: { ingredient: true } } } });
  }
}