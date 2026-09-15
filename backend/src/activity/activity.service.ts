import { Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { CreateActivitySummaryDto } from './dto/create-activity-summary.dto';
import type { ListActivityHistoryDto } from './dto/list-activity-history.dto';
import type { UpdateActivitySettingsDto } from './dto/update-activity-settings.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, payload: CreateActivitySummaryDto) {
    const recordedAt = new Date(payload.recordedAt);
    return this.prisma.activitySummary.upsert({ where: { userId_source_recordedAt: { userId, source: payload.source, recordedAt } }, update: { steps: payload.steps, distanceMeters: payload.distanceMeters, activeCalories: payload.activeCalories, workoutDurationMinutes: payload.workoutDurationMinutes, heartRateBpm: payload.heartRateBpm, sleepMinutes: payload.sleepMinutes, recoveryScore: payload.recoveryScore }, create: { userId, ...payload, recordedAt } });
  }

  async list(userId: string) {
    return this.prisma.activitySummary.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' } });
  }

  async getToday(userId: string) {
    const [settings, records] = await Promise.all([this.settings(userId), this.prisma.activitySummary.findMany({ where: { userId, recordedAt: today() }, orderBy: { updatedAt: 'desc' } })]);
    const primary = pickPrimary(records);
    return { stepGoal: settings.stepGoal, progress: primary?.steps === null || primary?.steps === undefined ? null : Math.min(100, Math.round(primary.steps / settings.stepGoal * 100)), primary: primary ?? null, sources: records, note: 'Activity values are estimates or device-provided data. Active calories are not exact.' };
  }

  async history(userId: string, query: ListActivityHistoryDto) {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - (query.days ?? 28) + 1);
    const records = await this.prisma.activitySummary.findMany({ where: { userId, recordedAt: { gte: start } }, orderBy: { recordedAt: 'asc' } });
    const byDate = new Map<string, typeof records>();
    for (const record of records) { const key = record.recordedAt.toISOString().slice(0, 10); byDate.set(key, [...(byDate.get(key) ?? []), record]); }
    return [...byDate.entries()].map(([date, sources]) => ({ date, primary: pickPrimary(sources) ?? null, sources }));
  }

  async updateSettings(userId: string, payload: UpdateActivitySettingsDto) { return this.prisma.activitySettings.upsert({ where: { userId }, update: payload, create: { userId, ...payload } }); }

  private async settings(userId: string) { return this.prisma.activitySettings.upsert({ where: { userId }, update: {}, create: { userId } }); }
}

function today(): Date { const date = new Date(); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function pickPrimary<T extends { source: string }>(records: T[]): T | undefined { const priority = ['HEALTH_CONNECT', 'HEALTHKIT', 'WEARABLE', 'MANUAL']; return [...records].sort((left, right) => priority.indexOf(left.source) - priority.indexOf(right.source))[0]; }
