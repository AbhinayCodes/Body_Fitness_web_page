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
exports.NutritionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
const nutrition_calculation_service_1 = require("./nutrition-calculation.service");
let NutritionService = class NutritionService {
    prisma;
    calculator;
    constructor(prisma, calculator) {
        this.prisma = prisma;
        this.calculator = calculator;
    }
    async getTargets(userId) {
        const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
        if (!onboarding?.completed)
            throw new common_1.BadRequestException('Complete onboarding before calculating nutrition targets.');
        if (!onboarding.age || !onboarding.sex || !onboarding.heightCm || !onboarding.weightKg || !onboarding.primaryGoal || !onboarding.trainingExperience || !onboarding.workoutDurationMinutes || !onboarding.trainingLocation)
            throw new common_1.BadRequestException('Your onboarding profile is incomplete.');
        return this.calculator.calculate({
            age: onboarding.age,
            sex: onboarding.sex,
            heightCm: onboarding.heightCm,
            weightKg: onboarding.weightKg,
            trainingDays: onboarding.trainingDays,
            workoutDurationMinutes: onboarding.workoutDurationMinutes,
            trainingExperience: onboarding.trainingExperience,
            trainingLocation: onboarding.trainingLocation,
            primaryGoal: onboarding.primaryGoal,
            secondaryGoals: onboarding.secondaryGoals,
            dailyActivity: onboarding.dailyActivity,
            workSchedule: onboarding.workSchedule ?? undefined,
            preferredGymTime: onboarding.preferredGymTime ?? undefined,
        });
    }
};
exports.NutritionService = NutritionService;
exports.NutritionService = NutritionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, nutrition_calculation_service_1.NutritionCalculationService])
], NutritionService);
//# sourceMappingURL=nutrition.service.js.map