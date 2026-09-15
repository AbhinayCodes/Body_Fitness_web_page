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
exports.TodayService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
const nutrition_service_1 = require("../nutrition/nutrition.service");
const schedule_service_1 = require("../schedule/schedule.service");
let TodayService = class TodayService {
    prisma;
    schedules;
    nutrition;
    constructor(prisma, schedules, nutrition) {
        this.prisma = prisma;
        this.schedules = schedules;
        this.nutrition = nutrition;
    }
    async get(userId) {
        const [profile, schedule, nutrition, activity] = await Promise.all([
            this.prisma.profile.findUnique({ where: { userId } }),
            this.schedules.getToday(userId),
            this.nutrition.getTargets(userId),
            this.prisma.activitySummary.findFirst({ where: { userId }, orderBy: { recordedAt: 'desc' } }),
        ]);
        if ('status' in schedule)
            return { status: schedule.status, message: schedule.metadata.message };
        const alternativeIds = schedule.meals.flatMap((meal) => meal.alternativeRecipeIds ?? []);
        const alternatives = alternativeIds.length ? await this.prisma.recipe.findMany({ where: { id: { in: alternativeIds } }, select: { id: true, name: true, calories: true, proteinGrams: true } }) : [];
        const meals = schedule.meals.map((meal) => ({ ...meal, alternatives: (meal.alternativeRecipeIds ?? []).map((recipeId) => alternatives.find((recipe) => recipe.id === recipeId)).filter((recipe) => Boolean(recipe)) }));
        const session = schedule.workoutPlanDay ? await this.prisma.workoutSession.findFirst({ where: { userId, workoutPlanDayId: schedule.workoutPlanDay.id, date: schedule.date }, include: { exercises: true } }) : null;
        const completedSets = session?.exercises.reduce((sum, exercise) => sum + exercise.setsCompleted, 0) ?? 0;
        const targetSets = schedule.workoutPlanDay?.exercises.reduce((sum, exercise) => sum + exercise.sets, 0) ?? 0;
        const eatenMeals = schedule.meals.filter((meal) => meal.eatenAt).length;
        return { status: 'READY', date: schedule.date, profile, nutrition, schedule: { id: schedule.id, isTrainingDay: schedule.isTrainingDay, meals, workout: schedule.workoutPlanDay ? { ...schedule.workoutPlanDay, completedSets, targetSets, completedExerciseSets: session?.exercises.map((exercise) => ({ exerciseIndex: exercise.exerciseIndex, setsCompleted: exercise.setsCompleted })) ?? [], completed: targetSets > 0 && completedSets >= targetSets } : null }, adherence: { mealsCompleted: eatenMeals, mealsPlanned: schedule.meals.length, workoutCompletedSets: completedSets, workoutTargetSets: targetSets, consistencyPercent: Math.round(((schedule.meals.length ? eatenMeals / schedule.meals.length : 1) + (targetSets ? completedSets / targetSets : 1)) / 2 * 100) }, activity };
    }
};
exports.TodayService = TodayService;
exports.TodayService = TodayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, schedule_service_1.ScheduleService, nutrition_service_1.NutritionService])
], TodayService);
//# sourceMappingURL=today.service.js.map