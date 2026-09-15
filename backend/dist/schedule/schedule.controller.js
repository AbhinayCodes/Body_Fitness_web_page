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
exports.ScheduleController = void 0;
const common_1 = require("@nestjs/common");
const authenticated_user_decorator_1 = require("../auth/authenticated-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const replace_scheduled_meal_dto_1 = require("./dto/replace-scheduled-meal.dto");
const schedule_service_1 = require("./schedule.service");
let ScheduleController = class ScheduleController {
    schedules;
    constructor(schedules) {
        this.schedules = schedules;
    }
    getToday(userId) { return this.schedules.getToday(userId); }
    replace(userId, scheduleId, payload) { return this.schedules.replaceMeal(userId, scheduleId, payload.slot, payload.recipeId); }
    markEaten(userId, scheduleId, slot) { return this.schedules.markMealEaten(userId, scheduleId, slot); }
};
exports.ScheduleController = ScheduleController;
__decorate([
    (0, common_1.Get)('today'),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ScheduleController.prototype, "getToday", null);
__decorate([
    (0, common_1.Put)(':scheduleId/meals'),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('scheduleId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, replace_scheduled_meal_dto_1.ReplaceScheduledMealDto]),
    __metadata("design:returntype", void 0)
], ScheduleController.prototype, "replace", null);
__decorate([
    (0, common_1.Put)(':scheduleId/meals/:slot/eaten'),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Param)('scheduleId')),
    __param(2, (0, common_1.Param)('slot')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ScheduleController.prototype, "markEaten", null);
exports.ScheduleController = ScheduleController = __decorate([
    (0, common_1.Controller)('api/v1/schedule'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [schedule_service_1.ScheduleService])
], ScheduleController);
//# sourceMappingURL=schedule.controller.js.map