import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { WorkoutStructureService } from './workout-structure.service';
import { contextFromOnboarding } from './onboarding-context';
import { exerciseLibrary } from './exercise-library';
import { prescribeWorkout, type ExerciseMeta, type PrescriptionContext, type WorkoutPrescription } from './workout-prescription';
import type { RichGoal } from './workout-planner.types';

export interface PersonalizedPrescription extends WorkoutPrescription {
  requiresMedicalClearance: boolean;
  safetyNotices: string[];
}

const META: Map<string, ExerciseMeta> = new Map(exerciseLibrary.map((exercise) => [exercise.slug, { mechanics: exercise.mechanics, difficulty: exercise.difficulty, estimatedMinutes: exercise.estimatedMinutes }]));

// Reusable service: prescribes sets/reps/rest/intensity for a user's weekly structure. It consumes
// the structure (which already selected exercises) and does not re-select or compute nutrition.
@Injectable()
export class WorkoutPrescriptionService {
  constructor(private readonly prisma: PrismaService, private readonly structures: WorkoutStructureService) {}

  async generate(userId: string): Promise<PersonalizedPrescription> {
    const structure = await this.structures.generate(userId);
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.primaryGoal || !onboarding.trainingExperience || !onboarding.workoutDurationMinutes || !onboarding.trainingDays.length) {
      throw new BadRequestException('Complete your training profile before generating a workout prescription.');
    }
    const responses = (onboarding.responses ?? {}) as Record<string, unknown>;
    const context: PrescriptionContext = {
      primaryGoal: onboarding.primaryGoal as PrescriptionContext['primaryGoal'],
      richGoal: typeof responses.primaryGoal === 'string' ? (responses.primaryGoal as RichGoal) : undefined,
      secondaryGoals: onboarding.secondaryGoals,
      trainingExperience: onboarding.trainingExperience as PrescriptionContext['trainingExperience'],
      trainingFrequency: onboarding.trainingDays.length,
      workoutDurationMinutes: onboarding.workoutDurationMinutes as PrescriptionContext['workoutDurationMinutes'],
      recovery: contextFromOnboarding(onboarding).recovery,
      requiresGentle: structure.requiresMedicalClearance,
    };

    return { ...prescribeWorkout(structure, context, META), requiresMedicalClearance: structure.requiresMedicalClearance, safetyNotices: structure.safetyNotices };
  }
}
