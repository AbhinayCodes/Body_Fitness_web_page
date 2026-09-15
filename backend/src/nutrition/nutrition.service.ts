import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { NutritionCalculationService } from './nutrition-calculation.service';
import type { NutritionCalculationInput } from './nutrition-calculation.types';

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService, private readonly calculator: NutritionCalculationService) {}

  async getTargets(userId: string) {
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    if (!onboarding?.completed) throw new BadRequestException('Complete onboarding before calculating nutrition targets.');
    if (!onboarding.age || !onboarding.sex || !onboarding.heightCm || !onboarding.weightKg || !onboarding.primaryGoal || !onboarding.trainingExperience || !onboarding.workoutDurationMinutes || !onboarding.trainingLocation) throw new BadRequestException('Your onboarding profile is incomplete.');
    return this.calculator.calculate({
      age: onboarding.age,
      sex: onboarding.sex as NutritionCalculationInput['sex'],
      heightCm: onboarding.heightCm,
      weightKg: onboarding.weightKg,
      trainingDays: onboarding.trainingDays,
      workoutDurationMinutes: onboarding.workoutDurationMinutes as NutritionCalculationInput['workoutDurationMinutes'],
      trainingExperience: onboarding.trainingExperience as NutritionCalculationInput['trainingExperience'],
      trainingLocation: onboarding.trainingLocation as NutritionCalculationInput['trainingLocation'],
      primaryGoal: onboarding.primaryGoal as NutritionCalculationInput['primaryGoal'],
      secondaryGoals: onboarding.secondaryGoals,
      dailyActivity: onboarding.dailyActivity as NutritionCalculationInput['dailyActivity'],
      workSchedule: onboarding.workSchedule ?? undefined,
      preferredGymTime: onboarding.preferredGymTime ?? undefined,
    });
  }
}