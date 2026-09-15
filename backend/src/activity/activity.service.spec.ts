import { describe, expect, it, jest } from '@jest/globals';
import { ActivityService } from './activity.service';

function createService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    activitySummary: { upsert: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
    activitySettings: { upsert: jest.fn().mockResolvedValue({ stepGoal: 8000 }) },
    ...overrides,
  };
  return { service: new ActivityService(prisma as never), prisma };
}

describe('ActivityService', () => {
  it('returns a real empty state when no activity exists', async () => {
    const { service } = createService();
    await expect(service.getToday('user-id')).resolves.toMatchObject({ stepGoal: 8000, progress: null, primary: null, sources: [] });
  });

  it('upserts duplicate source/day syncs instead of creating duplicate records', async () => {
    const { service, prisma } = createService();
    await service.create('user-id', { source: 'HEALTH_CONNECT' as never, recordedAt: '2026-09-15', steps: 6000, distanceMeters: 4200, activeCalories: 280 });
    expect(prisma.activitySummary.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_source_recordedAt: { userId: 'user-id', source: 'HEALTH_CONNECT', recordedAt: new Date('2026-09-15') } }, update: expect.objectContaining({ steps: 6000 }) }));
  });

  it('reports source data and deterministically prefers Health Connect for daily progress', async () => {
    const records = [{ source: 'MANUAL', steps: 2000 }, { source: 'WEARABLE', steps: 5000 }, { source: 'HEALTH_CONNECT', steps: 6400 }];
    const { service } = createService({ activitySummary: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue(records) }, activitySettings: { upsert: jest.fn().mockResolvedValue({ stepGoal: 8000 }) } });
    await expect(service.getToday('user-id')).resolves.toMatchObject({ progress: 80, primary: { source: 'HEALTH_CONNECT', steps: 6400 }, sources: records });
  });

  it('returns grouped historical records across days and sources', async () => {
    const records = [{ source: 'MANUAL', recordedAt: new Date('2026-09-10'), steps: 3000 }, { source: 'HEALTHKIT', recordedAt: new Date('2026-09-10'), steps: 5000 }, { source: 'WEARABLE', recordedAt: new Date('2026-09-11'), steps: 7000 }];
    const { service } = createService({ activitySummary: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue(records) } });
    const history = await service.history('user-id', { days: 14 });
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ date: '2026-09-10', primary: { source: 'HEALTHKIT' }, sources: [records[0], records[1]] });
  });

  it('persists a configurable activity goal', async () => {
    const { service, prisma } = createService();
    await service.updateSettings('user-id', { stepGoal: 10000 });
    expect(prisma.activitySettings.upsert).toHaveBeenCalledWith({ where: { userId: 'user-id' }, update: { stepGoal: 10000 }, create: { userId: 'user-id', stepGoal: 10000 } });
  });
});