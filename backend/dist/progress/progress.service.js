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
exports.ProgressService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
let ProgressService = class ProgressService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCheckIn(userId, payload) {
        const measurements = payload.measurements ?? [];
        if (new Set(measurements.map((measurement) => measurement.type)).size !== measurements.length)
            throw new common_1.BadRequestException('Each measurement type can be recorded once per check-in.');
        return this.prisma.progressCheckIn.upsert({ where: { userId_recordedAt: { userId, recordedAt: new Date(payload.recordedAt) } }, update: { weightKg: payload.weightKg, measurements: { deleteMany: {}, create: measurements } }, create: { userId, recordedAt: new Date(payload.recordedAt), weightKg: payload.weightKg, measurements: { create: measurements } }, include: { measurements: true } });
    }
    async updateSettings(userId, payload) {
        return this.prisma.progressSettings.upsert({ where: { userId }, update: payload, create: { userId, ...payload } });
    }
    async logPerformance(userId, payload) {
        const exercise = await this.prisma.exercise.findUnique({ where: { id: payload.exerciseId }, select: { id: true } });
        if (!exercise)
            throw new common_1.BadRequestException('Exercise not found.');
        return this.prisma.exercisePerformance.create({ data: { userId, exerciseId: exercise.id, recordedAt: new Date(payload.recordedAt), sets: payload.sets, reps: payload.reps, weightKg: payload.weightKg } });
    }
    async getSummary(userId) {
        const [settings, checkIns, schedules, sessions, performances] = await Promise.all([
            this.prisma.progressSettings.findUnique({ where: { userId } }),
            this.prisma.progressCheckIn.findMany({ where: { userId }, orderBy: { recordedAt: 'asc' }, include: { measurements: true } }),
            this.prisma.dailySchedule.findMany({ where: { userId, date: { gte: daysAgo(28) } }, include: { meals: true, workoutPlanDay: true } }),
            this.prisma.workoutSession.findMany({ where: { userId, date: { gte: daysAgo(28) }, workoutPlanDayId: { not: null } }, include: { exercises: true, workoutPlanDay: { include: { exercises: true } } } }),
            this.prisma.exercisePerformance.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' }, take: 20, include: { exercise: { select: { name: true } } } }),
        ]);
        const last = checkIns.at(-1);
        const previous = checkIns.at(-2);
        const dueDate = last ? addDays(last.recordedAt, settings?.checkInFrequencyDays ?? 7) : new Date();
        const plannedWorkouts = schedules.filter((schedule) => schedule.workoutPlanDay).length;
        const completedWorkouts = sessions.filter((session) => {
            const targetSets = session.workoutPlanDay?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
            const completedSets = session.exercises.reduce((sum, exercise) => sum + exercise.setsCompleted, 0);
            return targetSets > 0 && completedSets >= targetSets;
        }).length;
        const plannedMeals = schedules.reduce((total, schedule) => total + schedule.meals.length, 0);
        const eatenMeals = schedules.reduce((total, schedule) => total + schedule.meals.filter((meal) => meal.eatenAt).length, 0);
        return { checkIn: { frequencyDays: settings?.checkInFrequencyDays ?? 7, due: dueDate <= new Date(), dueDate, latest: last ?? null, previous: previous ?? null, weightChangeKg: last && previous ? round(Number(last.weightKg) - Number(previous.weightKg)) : null, note: 'Weight and measurements are observations. They do not establish body-composition or health changes.' }, weightTrend: checkIns.map((checkIn) => ({ date: checkIn.recordedAt, weightKg: Number(checkIn.weightKg) })), consistency: { plannedWorkouts, completedWorkouts, workoutCompletionPercent: plannedWorkouts ? Math.round(completedWorkouts / plannedWorkouts * 100) : 0, mealsPlanned: plannedMeals, mealsCompleted: eatenMeals, mealAdherencePercent: plannedMeals ? Math.round(eatenMeals / plannedMeals * 100) : 0 }, performance: performances.map((performance) => ({ date: performance.recordedAt, exercise: performance.exercise.name, sets: performance.sets, reps: performance.reps, weightKg: performance.weightKg ? Number(performance.weightKg) : null })) };
    }
};
exports.ProgressService = ProgressService;
exports.ProgressService = ProgressService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProgressService);
function daysAgo(days) { const date = new Date(); date.setUTCDate(date.getUTCDate() - days); return date; }
function addDays(date, days) { const value = new Date(date); value.setUTCDate(value.getUTCDate() + days); return value; }
function round(value) { return Math.round(value * 100) / 100; }
//# sourceMappingURL=progress.service.js.map