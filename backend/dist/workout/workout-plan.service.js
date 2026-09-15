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
exports.WorkoutPlanService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
const workout_planner_service_1 = require("./workout-planner.service");
let WorkoutPlanService = class WorkoutPlanService {
    prisma;
    planner;
    constructor(prisma, planner) {
        this.prisma = prisma;
        this.planner = planner;
    }
    async getPlan(userId) {
        const input = await this.inputFromOnboarding(userId);
        const sourceFingerprint = this.planner.fingerprint(input);
        const existing = await this.prisma.workoutPlan.findUnique({ where: { userId_sourceFingerprint: { userId, sourceFingerprint } }, include: planInclude });
        if (existing)
            return existing;
        const catalog = await this.prisma.exercise.findMany();
        const generated = this.planner.generate(input, catalog);
        return this.prisma.workoutPlan.create({ data: { userId, sourceFingerprint, goal: generated.goal, experience: generated.experience, durationMinutes: generated.durationMinutes, trainingLocation: generated.trainingLocation, trainingDays: generated.trainingDays, days: { create: generated.days.map((day, dayOrder) => ({ weekday: day.weekday, dayOrder, title: day.title, targetMuscleGroups: day.targetMuscleGroups, estimatedMinutes: day.estimatedMinutes, exercises: { create: day.exercises.map(({ exerciseId, exerciseOrder, sets, reps, restSeconds }) => ({ exerciseId, exerciseOrder, sets, reps, restSeconds })) } })) } }, include: planInclude });
    }
    async inputFromOnboarding(userId) {
        const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
        if (!onboarding?.completed)
            throw new common_1.BadRequestException('Complete onboarding before generating a workout plan.');
        if (!onboarding.primaryGoal || !onboarding.trainingExperience || !onboarding.workoutDurationMinutes || !onboarding.trainingLocation)
            throw new common_1.BadRequestException('Your training profile is incomplete.');
        return { primaryGoal: onboarding.primaryGoal, trainingExperience: onboarding.trainingExperience, trainingDays: onboarding.trainingDays, workoutDurationMinutes: onboarding.workoutDurationMinutes, trainingLocation: onboarding.trainingLocation, equipment: onboarding.equipment };
    }
};
exports.WorkoutPlanService = WorkoutPlanService;
exports.WorkoutPlanService = WorkoutPlanService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, workout_planner_service_1.WorkoutPlannerService])
], WorkoutPlanService);
const planInclude = { days: { orderBy: { dayOrder: 'asc' }, include: { exercises: { orderBy: { exerciseOrder: 'asc' }, include: { exercise: true } } } } };
//# sourceMappingURL=workout-plan.service.js.map