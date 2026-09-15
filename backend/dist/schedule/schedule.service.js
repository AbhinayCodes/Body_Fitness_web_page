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
exports.ScheduleService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const prisma_service_1 = require("../data-access/prisma.service");
const nutrition_service_1 = require("../nutrition/nutrition.service");
const recipe_repository_1 = require("../recipe/recipe.repository");
const workout_plan_service_1 = require("../workout/workout-plan.service");
const schedule_planner_service_1 = require("./schedule-planner.service");
let ScheduleService = class ScheduleService {
    prisma;
    nutrition;
    recipes;
    workouts;
    planner;
    constructor(prisma, nutrition, recipes, workouts, planner) {
        this.prisma = prisma;
        this.nutrition = nutrition;
        this.recipes = recipes;
        this.workouts = workouts;
        this.planner = planner;
    }
    async getToday(userId, date = today()) {
        const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
        if (!onboarding?.completed || !onboarding.wakeTime || !onboarding.sleepTime || !onboarding.dietType || !onboarding.workoutDurationMinutes)
            throw new common_1.BadRequestException('Complete your routine and food preferences before creating a daily schedule.');
        const nutrition = await this.nutrition.getTargets(userId);
        if (nutrition.status !== 'READY' || !nutrition.targets)
            return nutrition;
        const workoutPlan = await this.workouts.getPlan(userId);
        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`));
        const workoutPlanDay = workoutPlan.days.find((day) => day.weekday === weekday);
        const sourceFingerprint = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify({ date, onboarding: onboarding.updatedAt, nutrition: nutrition.targets, workoutPlan: workoutPlan.id })).digest('hex');
        const existing = await this.prisma.dailySchedule.findUnique({ where: { userId_date_sourceFingerprint: { userId, date: new Date(`${date}T00:00:00.000Z`), sourceFingerprint } }, include: scheduleInclude });
        if (existing)
            return existing;
        const catalog = await this.recipes.findMany({});
        const generated = this.planner.generate({ wakeTime: onboarding.wakeTime, sleepTime: onboarding.sleepTime, gymTime: onboarding.preferredGymTime ?? undefined, workoutDurationMinutes: onboarding.workoutDurationMinutes, isTrainingDay: Boolean(workoutPlanDay), dietType: onboarding.dietType, restrictions: onboarding.foodRestrictions, targets: nutrition.targets }, catalog);
        return this.prisma.dailySchedule.create({ data: { userId, date: new Date(`${date}T00:00:00.000Z`), sourceFingerprint, isTrainingDay: Boolean(workoutPlanDay), workoutPlanDayId: workoutPlanDay?.id, meals: { create: generated.meals } }, include: scheduleInclude });
    }
    async replaceMeal(userId, scheduleId, slot, recipeId) {
        const meal = await this.prisma.dailyScheduleMeal.findFirst({ where: { dailyScheduleId: scheduleId, slot, dailySchedule: { userId } } });
        if (!meal)
            throw new common_1.NotFoundException('Scheduled meal not found.');
        if (!meal.alternativeRecipeIds.includes(recipeId))
            throw new common_1.BadRequestException('Choose one of this meal\'s listed alternatives.');
        return this.prisma.dailyScheduleMeal.update({ where: { id: meal.id }, data: { recipeId, alternativeRecipeIds: [meal.recipeId, ...meal.alternativeRecipeIds.filter((id) => id !== recipeId)] }, include: { recipe: true } });
    }
    async markMealEaten(userId, scheduleId, slot) {
        const meal = await this.prisma.dailyScheduleMeal.findFirst({ where: { dailyScheduleId: scheduleId, slot, dailySchedule: { userId } } });
        if (!meal)
            throw new common_1.NotFoundException('Scheduled meal not found.');
        return this.prisma.dailyScheduleMeal.update({ where: { id: meal.id }, data: { eatenAt: new Date() }, include: { recipe: true } });
    }
};
exports.ScheduleService = ScheduleService;
exports.ScheduleService = ScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, nutrition_service_1.NutritionService, recipe_repository_1.RecipeRepository, workout_plan_service_1.WorkoutPlanService, schedule_planner_service_1.SchedulePlannerService])
], ScheduleService);
const scheduleInclude = { meals: { orderBy: { scheduledMinutes: 'asc' }, include: { recipe: true } }, workoutPlanDay: { include: { exercises: { orderBy: { exerciseOrder: 'asc' }, include: { exercise: true } } } } };
function today() { return new Date().toISOString().slice(0, 10); }
//# sourceMappingURL=schedule.service.js.map