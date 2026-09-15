import { describe, expect, it, jest } from '@jest/globals';
import { OnboardingService } from './onboarding.service';

const userId = '0c286dca-1f70-4a23-8ba9-3a720bd9c2ce';
const completedData = {
  age: 24, sex: 'FEMALE', heightCm: 165, weightKg: 58, primaryGoal: 'Maintain fitness', secondaryGoals: ['Improve mobility'], trainingExperience: 'BEGINNER', trainingDays: ['Monday', 'Thursday'], workoutDurationMinutes: 45, trainingLocation: 'HOME', equipment: ['Yoga mat'], dietType: 'Vegetarian', foodPreferences: ['Home cooked'], foodRestrictions: [], wakeTime: '07:00', workSchedule: 'Morning schedule', preferredGymTime: '07:30', sleepTime: '22:30', currentStep: 6, completed: true,
};

describe('OnboardingService', () => {
  it('returns an empty onboarding state for a new user and saved state for an existing user', async () => {
    const prisma = { onboarding: { findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(completedData) }, profile: { update: jest.fn() } };
    const service = new OnboardingService(prisma as never);
    await expect(service.get(userId)).resolves.toEqual({ currentStep: 1, completed: false });
    await expect(service.get(userId)).resolves.toEqual(completedData);
  });

  it('saves completed onboarding against the user and synchronizes the profile summary', async () => {
    const prisma = { onboarding: { upsert: jest.fn().mockResolvedValue(completedData) }, profile: { update: jest.fn().mockResolvedValue({}) } };
    const service = new OnboardingService(prisma as never);
    await expect(service.save(userId, completedData)).resolves.toEqual(completedData);
    expect(prisma.onboarding.upsert).toHaveBeenCalledWith({ where: { userId }, create: { userId, ...completedData }, update: completedData });
    expect(prisma.profile.update).toHaveBeenCalledWith({ where: { userId }, data: { goal: 'Maintain fitness', days: '2 days / week', diet: 'Vegetarian' } });
  });
});