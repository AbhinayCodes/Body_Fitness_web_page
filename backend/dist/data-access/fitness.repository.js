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
exports.FitnessRepository = void 0;
const common_1 = require("@nestjs/common");
const fitness_state_types_1 = require("./fitness-state.types");
const prisma_service_1 = require("./prisma.service");
let FitnessRepository = class FitnessRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getState(userId) {
        const user = await this.getUser(userId);
        return {
            profile: this.toProfile(user.profile),
            mealDone: user.mealDone,
            workoutHistory: user.workoutSessions.map((session) => ({
                date: this.toDateString(session.date),
                exercises: session.exercises.map((exercise) => exercise.exerciseIndex),
                durationMinutes: session.durationMinutes,
            })),
            mealHistory: user.mealLogs.map((meal) => ({ date: this.toDateString(meal.date), meal: meal.meal })),
        };
    }
    async updateProfile(userId, payload) {
        const user = await this.getUser(userId);
        const profile = await this.prisma.profile.update({
            where: { userId: user.id },
            data: payload,
        });
        return this.toProfile(profile);
    }
    async createWorkout(userId, payload) {
        const user = await this.getUser(userId);
        const workout = await this.prisma.workoutSession.create({
            data: {
                userId: user.id,
                date: new Date(),
                durationMinutes: payload.durationMinutes ?? 52,
                exercises: { create: (payload.exercises ?? []).map((exerciseIndex) => ({ exerciseIndex })) },
            },
            include: { exercises: { orderBy: { exerciseIndex: 'asc' } } },
        });
        return { date: this.toDateString(workout.date), exercises: workout.exercises.map((exercise) => exercise.exerciseIndex), durationMinutes: workout.durationMinutes };
    }
    async createMeal(userId, payload) {
        const user = await this.getUser(userId);
        const meal = await this.prisma.$transaction(async (transaction) => {
            await transaction.user.update({ where: { id: user.id }, data: { mealDone: true } });
            return transaction.mealLog.create({ data: { userId: user.id, date: new Date(), meal: payload.meal ?? 'Paneer rice bowl' } });
        });
        return { date: this.toDateString(meal.date), meal: meal.meal };
    }
    async getUser(userId) {
        return this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            include: {
                profile: true,
                workoutSessions: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }], include: { exercises: { orderBy: { exerciseIndex: 'asc' } } } },
                mealLogs: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
            },
        });
    }
    toProfile(profile) {
        return profile ? { name: profile.name, goal: profile.goal, days: profile.days, diet: profile.diet } : fitness_state_types_1.DEFAULT_STATE.profile;
    }
    toDateString(date) {
        return date.toISOString().slice(0, 10);
    }
};
exports.FitnessRepository = FitnessRepository;
exports.FitnessRepository = FitnessRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FitnessRepository);
//# sourceMappingURL=fitness.repository.js.map