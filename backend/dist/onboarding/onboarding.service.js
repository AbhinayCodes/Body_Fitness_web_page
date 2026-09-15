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
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../data-access/prisma.service");
let OnboardingService = class OnboardingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async get(userId) {
        const onboarding = await this.prisma.onboarding.findUnique({ where: { userId } });
        return onboarding ?? { currentStep: 1, completed: false };
    }
    async save(userId, payload) {
        const onboarding = await this.prisma.onboarding.upsert({ where: { userId }, create: { userId, ...payload }, update: payload });
        if (onboarding.completed) {
            await this.prisma.profile.update({
                where: { userId },
                data: {
                    goal: onboarding.primaryGoal ?? 'Maintain fitness',
                    days: `${onboarding.trainingDays.length} days / week`,
                    diet: onboarding.dietType ?? 'No preference',
                },
            });
        }
        return onboarding;
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map