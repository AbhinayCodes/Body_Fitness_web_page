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
exports.ProgressController = void 0;
const common_1 = require("@nestjs/common");
const authenticated_user_decorator_1 = require("../auth/authenticated-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_check_in_dto_1 = require("./dto/create-check-in.dto");
const create_exercise_performance_dto_1 = require("./dto/create-exercise-performance.dto");
const update_progress_settings_dto_1 = require("./dto/update-progress-settings.dto");
const progress_service_1 = require("./progress.service");
let ProgressController = class ProgressController {
    progress;
    constructor(progress) {
        this.progress = progress;
    }
    get(userId) { return this.progress.getSummary(userId); }
    checkIn(userId, payload) { return this.progress.createCheckIn(userId, payload); }
    settings(userId, payload) { return this.progress.updateSettings(userId, payload); }
    performance(userId, payload) { return this.progress.logPerformance(userId, payload); }
};
exports.ProgressController = ProgressController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProgressController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('check-ins'),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_check_in_dto_1.CreateCheckInDto]),
    __metadata("design:returntype", void 0)
], ProgressController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Put)('settings'),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_progress_settings_dto_1.UpdateProgressSettingsDto]),
    __metadata("design:returntype", void 0)
], ProgressController.prototype, "settings", null);
__decorate([
    (0, common_1.Post)('performances'),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_exercise_performance_dto_1.CreateExercisePerformanceDto]),
    __metadata("design:returntype", void 0)
], ProgressController.prototype, "performance", null);
exports.ProgressController = ProgressController = __decorate([
    (0, common_1.Controller)('api/v1/progress'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [progress_service_1.ProgressService])
], ProgressController);
//# sourceMappingURL=progress.controller.js.map