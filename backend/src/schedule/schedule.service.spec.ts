import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { ScheduleService } from './schedule.service';

describe('ScheduleService replacement', () => {
  it('only replaces a user-owned scheduled meal with one of its listed alternatives', async () => {
    const prisma = { dailyScheduleMeal: { findFirst: jest.fn().mockResolvedValue({ id: 'meal-id', recipeId: 'current', alternativeRecipeIds: ['alternative'], dailyScheduleId: 'schedule-id' }), update: jest.fn().mockResolvedValue({}) } };
    const service = new ScheduleService(prisma as never, {} as never, {} as never, {} as never, {} as never);
    await service.replaceMeal('user-id', 'schedule-id', 'DINNER', 'alternative');
    expect(prisma.dailyScheduleMeal.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'meal-id' }, data: { recipeId: 'alternative', alternativeRecipeIds: ['current'] } }));
    await expect(service.replaceMeal('user-id', 'schedule-id', 'DINNER', 'not-listed')).rejects.toBeInstanceOf(BadRequestException);
  });
});