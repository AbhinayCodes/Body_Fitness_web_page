import { describe, expect, it, jest } from '@jest/globals';
import { ReminderService } from './reminder.service';

const settings = { timezone: 'Asia/Kolkata', workoutEnabled: true, mealEnabled: true, preWorkoutEnabled: true, postWorkoutEnabled: true, checkInEnabled: true, workoutLeadMinutes: 30, mealLeadMinutes: 10, checkInTime: '09:00' };
const schedule = { id: 'schedule-id', date: new Date('2026-09-15T00:00:00.000Z'), isTrainingDay: true, workoutPlanDayId: 'plan-day', meals: [{ id: 'breakfast', slot: 'BREAKFAST', scheduledMinutes: 480, recipe: { name: 'Poha' } }, { id: 'pre', slot: 'PRE_WORKOUT', scheduledMinutes: 1080, recipe: { name: 'Smoothie' } }, { id: 'post', slot: 'POST_WORKOUT', scheduledMinutes: 1200, recipe: { name: 'Rice bowl' } }] };

function createService(settingsOverride: Record<string, unknown> = {}) {
  const prisma = { reminderSettings: { upsert: jest.fn().mockResolvedValue({ ...settings, ...settingsOverride }) }, onboarding: { findUnique: jest.fn().mockResolvedValue({ preferredGymTime: '18:30' }) }, reminderOccurrence: { upsert: jest.fn((value) => Promise.resolve({ ...value.create })) } };
  return { service: new ReminderService(prisma as never, { getToday: jest.fn().mockResolvedValue(schedule) } as never, { getSummary: jest.fn().mockResolvedValue({ checkIn: { due: true } }) } as never), prisma };
}

describe('ReminderService', () => {
  it('creates enabled routine-derived reminders with no duplicate occurrence keys', async () => {
    const { service, prisma } = createService();
    const first = await service.getToday('user-id');
    await service.getToday('user-id');
    expect(first.occurrences).toHaveLength(5);
    expect(prisma.reminderOccurrence.upsert).toHaveBeenCalledTimes(10);
    const occurrenceKeys = prisma.reminderOccurrence.upsert.mock.calls.map((call) => call[0].where.userId_kind_sourceKey_scheduledLocalDate);
    expect(new Set(occurrenceKeys.slice(0, 5).map((key) => JSON.stringify(key))).size).toBe(5);
  });

  it('does not create disabled reminders', async () => {
    const { service } = createService({ workoutEnabled: false, mealEnabled: false, preWorkoutEnabled: false, postWorkoutEnabled: false, checkInEnabled: false });
    await expect(service.getToday('user-id')).resolves.toMatchObject({ occurrences: [] });
  });

  it('uses changed gym and meal times from live schedule/settings', async () => {
    const { service, prisma } = createService({ workoutLeadMinutes: 45, mealLeadMinutes: 15 });
    await service.getToday('user-id');
    const created = prisma.reminderOccurrence.upsert.mock.calls.map((call) => call[0].create);
    expect(created.find((item) => item.kind === 'WORKOUT').scheduledMinutes).toBe(18 * 60 + 30 - 45);
    expect(created.find((item) => item.sourceKey === 'breakfast').scheduledMinutes).toBe(465);
  });

  it('validates timezone updates and stores valid IANA timezones', async () => {
    const { service, prisma } = createService();
    await expect(service.updateSettings('user-id', { timezone: 'America/New_York' })).resolves.toBeDefined();
    expect(prisma.reminderSettings.upsert).toHaveBeenLastCalledWith(expect.objectContaining({ update: { timezone: 'America/New_York' } }));
    await expect(service.updateSettings('user-id', { timezone: 'Not/AZone' })).rejects.toMatchObject({ status: 400 });
  });
});