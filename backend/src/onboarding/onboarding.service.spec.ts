import { describe, expect, it, jest } from '@jest/globals';
import { ValidationPipe } from '@nestjs/common';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { OnboardingService } from './onboarding.service';

const userId = '0c286dca-1f70-4a23-8ba9-3a720bd9c2ce';
const completedData = {
  age: 24, sex: 'FEMALE', heightCm: 165, weightKg: 58, primaryGoal: 'Maintain fitness', secondaryGoals: ['Improve mobility'], trainingExperience: 'BEGINNER', trainingDays: ['Monday', 'Thursday'], workoutDurationMinutes: 45, trainingLocation: 'HOME', equipment: ['Yoga mat'], dietType: 'Vegetarian', foodPreferences: ['Home cooked'], foodRestrictions: [], wakeTime: '07:00', workSchedule: 'Morning schedule', preferredGymTime: '07:30', sleepTime: '22:30', currentStep: 6, completed: true,
};

describe('OnboardingService', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const validate = (payload: unknown) => pipe.transform(payload, { type: 'body', metatype: SaveOnboardingDto });

  it('accepts the body-step draft before training days have been selected', async () => {
    const draft = { age: 24, sex: 'MALE', heightCm: 184, weightKg: 84, trainingDays: [], equipment: [], foodPreferences: [], foodRestrictions: [], secondaryGoals: [], currentStep: 2, completed: false };
    await expect(validate(draft)).resolves.toMatchObject(draft);
  });

  it('accepts completed setup and rejects final submission without training days', async () => {
    await expect(validate(completedData)).resolves.toMatchObject(completedData);
    await expect(validate({ ...completedData, trainingDays: [] })).rejects.toThrow();
    await expect(validate({ ...completedData, trainingDays: undefined })).rejects.toThrow();
  });

  it('rejects invalid training-day values even for drafts', async () => {
    await expect(validate({ completed: false, trainingDays: ['Someday'] })).rejects.toThrow();
    await expect(validate({ completed: false, trainingDays: 'Monday' })).rejects.toThrow();
  });

  it('returns a saved draft that can be submitted again after a page reload', async () => {
    const saved = { id: userId, userId, createdAt: new Date(), updatedAt: new Date(), age: 24, sex: 'MALE', heightCm: 184, weightKg: 84, primaryGoal: null, trainingExperience: null, trainingDays: [], currentStep: 2, completed: false };
    const prisma = { onboarding: { findUnique: jest.fn().mockResolvedValue(saved) } };
    const draft = await new OnboardingService(prisma as never).get(userId);
    await expect(validate(draft)).resolves.toMatchObject({ age: 24, trainingDays: [], completed: false });
    expect(draft).not.toHaveProperty('userId');
    expect(draft).not.toHaveProperty('createdAt');
    expect(draft).not.toHaveProperty('primaryGoal');
  });

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