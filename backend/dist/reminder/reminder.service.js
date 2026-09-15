"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
const progress_service_1 = require("../progress/progress.service");
const schedule_service_1 = require("../schedule/schedule.service");
let ReminderService = class ReminderService {
    prisma;
    schedules;
    progress;
    constructor(prisma, schedules, progress) {
        this.prisma = prisma;
        this.schedules = schedules;
        this.progress = progress;
    }
    async getSettings(userId) { return this.prisma.reminderSettings.upsert({ where: { userId }, update: {}, create: { userId } }); }
    async updateSettings(userId, payload) {
        if (payload.timezone)
            validateTimezone(payload.timezone);
        return this.prisma.reminderSettings.upsert({ where: { userId }, update: payload, create: { userId, ...payload } });
    }
    async getToday(userId) {
        const settings = await this.getSettings(userId);
        const schedule = await this.schedules.getToday(userId);
        if ('status' in schedule)
            return { settings, occurrences: [], message: schedule.metadata.message };
        const onboarding = await this.prisma.onboarding.findUnique({ where: { userId }, select: { preferredGymTime: true } });
        const progress = await this.progress.getSummary(userId);
        const localDate = dateInTimezone(schedule.date, settings.timezone);
        const candidates = this.candidates(schedule, settings, onboarding?.preferredGymTime ?? undefined, progress.checkIn.due);
        const occurrences = await Promise.all(candidates.map((candidate) => this.prisma.reminderOccurrence.upsert({ where: { userId_kind_sourceKey_scheduledLocalDate: { userId, kind: candidate.kind, sourceKey: candidate.sourceKey, scheduledLocalDate: localDate } }, update: { scheduledMinutes: candidate.scheduledMinutes, timezone: settings.timezone, payload: JSON.stringify({ title: candidate.title }) }, create: { userId, kind: candidate.kind, sourceKey: candidate.sourceKey, scheduledLocalDate: localDate, scheduledMinutes: candidate.scheduledMinutes, timezone: settings.timezone, payload: JSON.stringify({ title: candidate.title }) } })));
        return { settings, occurrences: occurrences.sort((left, right) => left.scheduledMinutes - right.scheduledMinutes), message: 'Reminders are prepared for this device or a future mobile delivery client. No push notifications are sent by this web app.' };
    }
    candidates(schedule, settings, gymTime, checkInDue) {
        const reminders = [];
        for (const meal of schedule.meals) {
            const enabled = meal.slot === 'PRE_WORKOUT' ? settings.preWorkoutEnabled : meal.slot === 'POST_WORKOUT' ? settings.postWorkoutEnabled : settings.mealEnabled;
            if (enabled)
                reminders.push({ kind: meal.slot === 'PRE_WORKOUT' ? 'PRE_WORKOUT' : meal.slot === 'POST_WORKOUT' ? 'POST_WORKOUT' : 'MEAL', sourceKey: meal.id, scheduledMinutes: Math.max(0, meal.scheduledMinutes - settings.mealLeadMinutes), title: `${meal.slot.replaceAll('_', ' ')}: ${meal.recipe.name}` });
        }
        if (settings.workoutEnabled && schedule.isTrainingDay && gymTime)
            reminders.push({ kind: 'WORKOUT', sourceKey: schedule.workoutPlanDayId ?? schedule.id, scheduledMinutes: Math.max(0, parseTime(gymTime) - settings.workoutLeadMinutes), title: 'Your workout is coming up' });
        if (settings.checkInEnabled && checkInDue)
            reminders.push({ kind: 'CHECK_IN', sourceKey: 'progress-check-in', scheduledMinutes: parseTime(settings.checkInTime), title: 'Time for your progress check-in' });
        return reminders;
    }
};
exports.ReminderService = ReminderService;
exports.ReminderService = ReminderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, schedule_service_1.ScheduleService, progress_service_1.ProgressService])
], ReminderService);
function parseTime(value) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; }
function validateTimezone(timezone) { try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
}
catch {
    throw new common_1.BadRequestException('Enter a valid IANA timezone.');
} }
function dateInTimezone(date, timezone) { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}`; }
//# sourceMappingURL=reminder.service.js.map