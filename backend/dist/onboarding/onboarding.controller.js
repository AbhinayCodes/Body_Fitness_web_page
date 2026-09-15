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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingController = void 0;
const common_1 = require("@nestjs/common");
const authenticated_user_decorator_1 = require("../auth/authenticated-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const save_onboarding_dto_1 = require("./dto/save-onboarding.dto");
const onboarding_service_1 = require("./onboarding.service");
let OnboardingController = class OnboardingController {
    onboardingService;
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    get(userId) { return this.onboardingService.get(userId); }
    save(userId, payload) { return this.onboardingService.save(userId, payload); }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, save_onboarding_dto_1.SaveOnboardingDto]),
    __metadata("design:returntype", void 0)
], OnboardingController.prototype, "save", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, common_1.Controller)('api/v1/onboarding'),
    __metadata("design:paramtypes", [onboarding_service_1.OnboardingService])
], OnboardingController);
//# sourceMappingURL=onboarding.controller.js.map