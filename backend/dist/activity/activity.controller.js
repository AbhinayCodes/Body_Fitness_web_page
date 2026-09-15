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
exports.ActivityController = void 0;
const common_1 = require("@nestjs/common");
const authenticated_user_decorator_1 = require("../auth/authenticated-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const activity_service_1 = require("./activity.service");
const create_activity_summary_dto_1 = require("./dto/create-activity-summary.dto");
const list_activity_history_dto_1 = require("./dto/list-activity-history.dto");
const update_activity_settings_dto_1 = require("./dto/update-activity-settings.dto");
let ActivityController = class ActivityController {
    activityService;
    constructor(activityService) {
        this.activityService = activityService;
    }
    list(userId) { return this.activityService.list(userId); }
    today(userId) { return this.activityService.getToday(userId); }
    history(userId, query) { return this.activityService.history(userId, query); }
    create(userId, payload) { return this.activityService.create(userId, payload); }
    settings(userId, payload) { return this.activityService.updateSettings(userId, payload); }
};
exports.ActivityController = ActivityController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivityController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActivityController.prototype, "today", null);
__decorate([
    (0, common_1.Get)('history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, list_activity_history_dto_1.ListActivityHistoryDto]),
    __metadata("design:returntype", void 0)
], ActivityController.prototype, "history", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_activity_summary_dto_1.CreateActivitySummaryDto]),
    __metadata("design:returntype", void 0)
], ActivityController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_activity_settings_dto_1.UpdateActivitySettingsDto]),
    __metadata("design:returntype", void 0)
], ActivityController.prototype, "settings", null);
exports.ActivityController = ActivityController = __decorate([
    (0, common_1.Controller)('api/v1/activity-summaries'),
    __metadata("design:paramtypes", [activity_service_1.ActivityService])
], ActivityController);
//# sourceMappingURL=activity.controller.js.map