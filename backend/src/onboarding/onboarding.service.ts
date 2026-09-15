import { Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';

const DEFAULT_USER_KEY = 'prototype-user';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<Record<string, unknown>> {
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId: await this.userId() } });
    return onboarding ?? { currentStep: 1, completed: false };
  }

  async save(payload: SaveOnboardingDto): Promise<Record<string, unknown>> {
    const userId = await this.userId();
    return this.prisma.onboarding.upsert({ where: { userId }, create: { userId, ...payload }, update: payload });
  }

  private async userId(): Promise<string> {
    const user = await this.prisma.user.upsert({
      where: { key: DEFAULT_USER_KEY }, update: {}, create: { key: DEFAULT_USER_KEY, profile: { create: { name: 'Rahul', goal: 'Build muscle', days: '4 days / week', diet: 'Vegetarian' } } },
    });
    return user.id;
  }
}
