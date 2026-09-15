import { Module } from '@nestjs/common';
import { NutritionCalculationService } from './nutrition-calculation.service';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';

@Module({ controllers: [NutritionController], providers: [NutritionCalculationService, NutritionService], exports: [NutritionCalculationService, NutritionService] })
export class NutritionModule {}