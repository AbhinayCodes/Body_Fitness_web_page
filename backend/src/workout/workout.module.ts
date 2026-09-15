import { Module } from '@nestjs/common';
import { WorkoutController } from './workout.controller';
import { WorkoutService } from './workout.service';
import { WorkoutPlanService } from './workout-plan.service';
import { WorkoutPlannerService } from './workout-planner.service';

@Module({ controllers: [WorkoutController], providers: [WorkoutService, WorkoutPlanService, WorkoutPlannerService], exports: [WorkoutPlanService] })
export class WorkoutModule {}
