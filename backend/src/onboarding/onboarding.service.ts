import { Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import type { SaveOnboardingDto } from './dto/save-onboarding.dto';

const onboardingFields = ['age', 'sex', 'heightCm', 'weightKg', 'primaryGoal', 'secondaryGoal', 'secondaryGoals', 'trainingExperience', 'trainingDays', 'workoutDurationMinutes', 'trainingLocation', 'equipment', 'dietType', 'foodPreferences', 'foodRestrictions', 'wakeTime', 'workSchedule', 'preferredGymTime', 'sleepTime', 'dailyActivity', 'currentStep', 'completed'] satisfies Array<keyof SaveOnboardingDto>;

function editableOnboarding(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(onboardingFields.filter((field) => record[field] !== null && record[field] !== undefined).map((field) => [field, record[field]]));
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<Record<string, unknown>> {
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
    return onboarding ? editableOnboarding(onboarding) : { currentStep: 1, completed: false };
  }

  async save(userId: string, payload: SaveOnboardingDto): Promise<Record<string, unknown>> {
    const onboarding = await this.prisma.onboarding.upsert({ where: { userId }, create: { userId, ...payload }, update: payload });
    if (onboarding.completed) {
      await this.prisma.profile.update({
        where: { userId },
        data: {
          goal: onboarding.primaryGoal ?? 'Maintain fitness',
          days: `${onboarding.trainingDays.length} days / week`,
          diet: onboarding.dietType ?? 'No preference',
        },
      });
    }
    return editableOnboarding(onboarding);
  }
}
