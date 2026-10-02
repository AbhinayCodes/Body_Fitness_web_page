import { Module } from '@nestjs/common';
import { WorkoutController } from './workout.controller';
import { WorkoutService } from './workout.service';
import { WorkoutPlanService } from './workout-plan.service';
import { WorkoutPlannerService } from './workout-planner.service';
import { ExerciseCandidateService } from './exercise-candidates.service';
import { ExerciseSelectionService } from './exercise-selection.service';
import { WorkoutStructureService } from './workout-structure.service';
import { WorkoutPrescriptionService } from './workout-prescription.service';
import { WorkoutValidationService } from './workout-validation.service';

@Module({ controllers: [WorkoutController], providers: [WorkoutService, WorkoutPlanService, WorkoutPlannerService, ExerciseCandidateService, ExerciseSelectionService, WorkoutStructureService, WorkoutPrescriptionService, WorkoutValidationService], exports: [WorkoutPlanService, ExerciseCandidateService, ExerciseSelectionService, WorkoutStructureService, WorkoutPrescriptionService, WorkoutValidationService] })
export class WorkoutModule {}
