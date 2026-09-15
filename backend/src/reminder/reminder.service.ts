import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../data-access/prisma.service';
import { ProgressService } from '../progress/progress.service';
import { ScheduleService } from '../schedule/schedule.service';
import type { UpdateReminderSettingsDto } from './dto/update-reminder-settings.dto';

type ReminderCandidate = { kind: string; sourceKey: string; scheduledMinutes: number; title: string };

@Injectable()
export class ReminderService {
  constructor(private readonly prisma: PrismaService, private readonly schedules: ScheduleService, private readonly progress: ProgressService) {}

  async getSettings(userId: string) { return this.prisma.reminderSettings.upsert({ where: { userId }, update: {}, create: { userId } }); }

  async updateSettings(userId: string, payload: UpdateReminderSettingsDto) {
    if (payload.timezone) validateTimezone(payload.timezone);
    return this.prisma.reminderSettings.upsert({ where: { userId }, update: payload, create: { userId, ...payload } });
  }

  async getToday(userId: string) {
    const settings = await this.getSettings(userId);
    const schedule = await this.schedules.getToday(userId);
    if ('status' in schedule) return { settings, occurrences: [], message: schedule.metadata.message };
    const onboarding = await this.prisma.onboarding.findUnique({ where: { userId }, select: { preferredGymTime: true } });
    const progress = await this.progress.getSummary(userId);
    const localDate = dateInTimezone(schedule.date, settings.timezone);
    const candidates = this.candidates(schedule, settings, onboarding?.preferredGymTime ?? undefined, progress.checkIn.due);
    const occurrences = await Promise.all(candidates.map((candidate) => this.prisma.reminderOccurrence.upsert({ where: { userId_kind_sourceKey_scheduledLocalDate: { userId, kind: candidate.kind, sourceKey: candidate.sourceKey, scheduledLocalDate: localDate } }, update: { scheduledMinutes: candidate.scheduledMinutes, timezone: settings.timezone, payload: JSON.stringify({ title: candidate.title }) }, create: { userId, kind: candidate.kind, sourceKey: candidate.sourceKey, scheduledLocalDate: localDate, scheduledMinutes: candidate.scheduledMinutes, timezone: settings.timezone, payload: JSON.stringify({ title: candidate.title }) } })));
    return { settings, occurrences: occurrences.sort((left, right) => left.scheduledMinutes - right.scheduledMinutes), message: 'Reminders are prepared for this device or a future mobile delivery client. No push notifications are sent by this web app.' };
  }

  private candidates(schedule: Awaited<ReturnType<ScheduleService['getToday']>> & { status?: never }, settings: Awaited<ReturnType<ReminderService['getSettings']>>, gymTime: string | undefined, checkInDue: boolean): ReminderCandidate[] {
    const reminders: ReminderCandidate[] = [];
    for (const meal of schedule.meals) {
      const enabled = meal.slot === 'PRE_WORKOUT' ? settings.preWorkoutEnabled : meal.slot === 'POST_WORKOUT' ? settings.postWorkoutEnabled : settings.mealEnabled;
      if (enabled) reminders.push({ kind: meal.slot === 'PRE_WORKOUT' ? 'PRE_WORKOUT' : meal.slot === 'POST_WORKOUT' ? 'POST_WORKOUT' : 'MEAL', sourceKey: meal.id, scheduledMinutes: Math.max(0, meal.scheduledMinutes - settings.mealLeadMinutes), title: `${meal.slot.replaceAll('_', ' ')}: ${meal.recipe.name}` });
    }
    if (settings.workoutEnabled && schedule.isTrainingDay && gymTime) reminders.push({ kind: 'WORKOUT', sourceKey: schedule.workoutPlanDayId ?? schedule.id, scheduledMinutes: Math.max(0, parseTime(gymTime) - settings.workoutLeadMinutes), title: 'Your workout is coming up' });
    if (settings.checkInEnabled && checkInDue) reminders.push({ kind: 'CHECK_IN', sourceKey: 'progress-check-in', scheduledMinutes: parseTime(settings.checkInTime), title: 'Time for your progress check-in' });
    return reminders;
  }
}

function parseTime(value: string): number { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function validateTimezone(timezone: string): void { try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }); } catch { throw new BadRequestException('Enter a valid IANA timezone.'); } }
function dateInTimezone(date: Date, timezone: string): string { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}`; }