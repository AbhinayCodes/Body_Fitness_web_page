import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListRecipesDto } from './dto/list-recipes.dto';
import { RecipeServingsDto } from './dto/recipe-servings.dto';
import { RecipeService } from './recipe.service';

@Controller('api/v1/recipes')
@UseGuards(JwtAuthGuard)
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Get()
  list(@Query() filters: ListRecipesDto) { return this.recipeService.list(filters); }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string, @Query() query: RecipeServingsDto) {
    return this.recipeService.getBySlug(slug, query.servings ?? 1);
  }
}