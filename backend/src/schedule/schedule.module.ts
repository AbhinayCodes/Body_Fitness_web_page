import { Module } from '@nestjs/common';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecipeModule } from '../recipe/recipe.module';
import { WorkoutModule } from '../workout/workout.module';
import { ScheduleController } from './schedule.controller';
import { SchedulePlannerService } from './schedule-planner.service';
import { ScheduleService } from './schedule.service';

@Module({ imports: [NutritionModule, RecipeModule, WorkoutModule], controllers: [ScheduleController], providers: [SchedulePlannerService, ScheduleService], exports: [ScheduleService] })
export class ScheduleModule {}