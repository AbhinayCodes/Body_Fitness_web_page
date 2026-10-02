import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { ExerciseCandidateService } from './exercise-candidates.service';
import { contextFromOnboarding } from './onboarding-context';
import { generateWeeklyStructure, type StructureContext, type WeeklyStructure } from './workout-structure';
import type { RichGoal } from './workout-planner.types';

export interface PersonalizedStructure extends WeeklyStructure {
  requiresMedicalClearance: boolean;
  safetyNotices: string[];
}

const FOCUS_TO_MUSCLE: Record<string, string> = { chest: 'chest', shoulders: 'shoulders', back: 'back', core: 'core', glutes: 'glutes', quads: 'quads', hamstrings: 'hamstrings', calves: 'calves', arms: 'biceps' };

// Reusable service: builds a weekly workout structure for a user. No sets/reps/progression.
@Injectable()
export class WorkoutStructureService {
  constructor(private readonly prisma: PrismaService, private readonly candidates: ExerciseCandidateService) {}

  async generate(userId: string): Promise<PersonalizedStructure> {
    const pool = await this.candidates.getCandidates(userId);
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.completed || !onboarding.primaryGoal || !onboarding.trainingExperience || !onboarding.workoutDurationMinutes || !onboarding.trainingDays.length) {
      throw new BadRequestException('Complete your training days and duration before generating a workout structure.');
    }
    const responses = (onboarding.responses ?? {}) as Record<string, unknown>;
    const focusAreas = Array.isArray(responses.focusAreas) ? responses.focusAreas.filter((area): area is string => typeof area === 'string') : [];
    const priorityMuscles = [...new Set(focusAreas.map((area) => FOCUS_TO_MUSCLE[area]).filter(Boolean))];

    const context: StructureContext = {
      primaryGoal: onboarding.primaryGoal as StructureContext['primaryGoal'],
      richGoal: typeof responses.primaryGoal === 'string' ? (responses.primaryGoal as RichGoal) : undefined,
      trainingExperience: onboarding.trainingExperience as StructureContext['trainingExperience'],
      trainingDays: onboarding.trainingDays,
      workoutDurationMinutes: onboarding.workoutDurationMinutes as StructureContext['workoutDurationMinutes'],
      recovery: contextFromOnboarding(onboarding).recovery,
      priorityMuscles: priorityMuscles.length ? priorityMuscles : undefined,
      requiresGentle: pool.requiresMedicalClearance,
    };

    return { ...generateWeeklyStructure(pool.candidates, context), requiresMedicalClearance: pool.requiresMedicalClearance, safetyNotices: pool.safetyNotices };
  }
}
