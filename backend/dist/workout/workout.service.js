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
exports.WorkoutService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
const fitness_repository_1 = require("../data-access/fitness.repository");
let WorkoutService = class WorkoutService {
    repository;
    prisma;
    constructor(repository, prisma) {
        this.repository = repository;
        this.prisma = prisma;
    }
    async createWorkout(userId, payload) {
        return this.repository.createWorkout(userId, payload);
    }
    async updateTodayProgress(userId, payload) {
        const planDay = await this.prisma.workoutPlanDay.findFirst({ where: { id: payload.workoutPlanDayId, workoutPlan: { userId } }, include: { exercises: true } });
        if (!planDay)
            throw new common_1.BadRequestException('Workout plan day not found.');
        const validIndexes = new Set(planDay.exercises.map((exercise) => exercise.exerciseOrder));
        if (payload.exercises.some((exercise) => !validIndexes.has(exercise.exerciseIndex)))
            throw new common_1.BadRequestException('Workout progress contains an invalid exercise.');
        const date = new Date();
        const existing = await this.prisma.workoutSession.findFirst({ where: { userId, workoutPlanDayId: planDay.id, date }, select: { id: true } });
        const session = existing
            ? await this.prisma.workoutSession.update({ where: { id: existing.id }, data: { durationMinutes: planDay.estimatedMinutes } })
            : await this.prisma.workoutSession.create({ data: { userId, workoutPlanDayId: planDay.id, date, durationMinutes: planDay.estimatedMinutes } });
        for (const exercise of payload.exercises)
            await this.prisma.exerciseCompletion.upsert({ where: { workoutSessionId_exerciseIndex: { workoutSessionId: session.id, exerciseIndex: exercise.exerciseIndex } }, update: { setsCompleted: exercise.setsCompleted }, create: { workoutSessionId: session.id, exerciseIndex: exercise.exerciseIndex, setsCompleted: exercise.setsCompleted } });
        return this.prisma.workoutSession.findUniqueOrThrow({ where: { id: session.id }, include: { exercises: { orderBy: { exerciseIndex: 'asc' } } } });
    }
};
exports.WorkoutService = WorkoutService;
exports.WorkoutService = WorkoutService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [fitness_repository_1.FitnessRepository, prisma_service_1.PrismaService])
], WorkoutService);
//# sourceMappingURL=workout.service.js.map