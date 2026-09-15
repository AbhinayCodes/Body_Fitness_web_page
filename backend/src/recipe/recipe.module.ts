import { Module } from '@nestjs/common';
import { RecipeController } from './recipe.controller';
import { RecipeRepository } from './recipe.repository';
import { RecipeService } from './recipe.service';

@Module({ controllers: [RecipeController], providers: [RecipeRepository, RecipeService], exports: [RecipeRepository, RecipeService] })
export class RecipeModule {}