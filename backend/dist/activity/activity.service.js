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
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
let ActivityService = class ActivityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, payload) {
        const recordedAt = new Date(payload.recordedAt);
        return this.prisma.activitySummary.upsert({ where: { userId_source_recordedAt: { userId, source: payload.source, recordedAt } }, update: { steps: payload.steps, distanceMeters: payload.distanceMeters, activeCalories: payload.activeCalories, workoutDurationMinutes: payload.workoutDurationMinutes, heartRateBpm: payload.heartRateBpm, sleepMinutes: payload.sleepMinutes, recoveryScore: payload.recoveryScore }, create: { userId, ...payload, recordedAt } });
    }
    async list(userId) {
        return this.prisma.activitySummary.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' } });
    }
    async getToday(userId) {
        const [settings, records] = await Promise.all([this.settings(userId), this.prisma.activitySummary.findMany({ where: { userId, recordedAt: today() }, orderBy: { updatedAt: 'desc' } })]);
        const primary = pickPrimary(records);
        return { stepGoal: settings.stepGoal, progress: primary?.steps === null || primary?.steps === undefined ? null : Math.min(100, Math.round(primary.steps / settings.stepGoal * 100)), primary: primary ?? null, sources: records, note: 'Activity values are estimates or device-provided data. Active calories are not exact.' };
    }
    async history(userId, query) {
        const start = new Date();
        start.setUTCDate(start.getUTCDate() - (query.days ?? 28) + 1);
        const records = await this.prisma.activitySummary.findMany({ where: { userId, recordedAt: { gte: start } }, orderBy: { recordedAt: 'asc' } });
        const byDate = new Map();
        for (const record of records) {
            const key = record.recordedAt.toISOString().slice(0, 10);
            byDate.set(key, [...(byDate.get(key) ?? []), record]);
        }
        return [...byDate.entries()].map(([date, sources]) => ({ date, primary: pickPrimary(sources) ?? null, sources }));
    }
    async updateSettings(userId, payload) { return this.prisma.activitySettings.upsert({ where: { userId }, update: payload, create: { userId, ...payload } }); }
    async settings(userId) { return this.prisma.activitySettings.upsert({ where: { userId }, update: {}, create: { userId } }); }
};
exports.ActivityService = ActivityService;
exports.ActivityService = ActivityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityService);
function today() { const date = new Date(); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function pickPrimary(records) { const priority = ['HEALTH_CONNECT', 'HEALTHKIT', 'WEARABLE', 'MANUAL']; return [...records].sort((left, right) => priority.indexOf(left.source) - priority.indexOf(right.source))[0]; }
//# sourceMappingURL=activity.service.js.map