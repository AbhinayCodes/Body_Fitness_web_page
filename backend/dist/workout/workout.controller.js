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
exports.WorkoutController = void 0;
const common_1 = require("@nestjs/common");
const authenticated_user_decorator_1 = require("../auth/authenticated-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_workout_dto_1 = require("./dto/create-workout.dto");
const workout_service_1 = require("./workout.service");
const workout_plan_service_1 = require("./workout-plan.service");
const update_workout_progress_dto_1 = require("./dto/update-workout-progress.dto");
let WorkoutController = class WorkoutController {
    workoutService;
    workoutPlanService;
    constructor(workoutService, workoutPlanService) {
        this.workoutService = workoutService;
        this.workoutPlanService = workoutPlanService;
    }
    getPlan(userId) { return this.workoutPlanService.getPlan(userId); }
    updateTodayProgress(userId, payload) { return this.workoutService.updateTodayProgress(userId, payload); }
    createWorkout(userId, payload) {
        return this.workoutService.createWorkout(userId, payload);
    }
};
exports.WorkoutController = WorkoutController;
__decorate([
    (0, common_1.Get)('plan'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WorkoutController.prototype, "getPlan", null);
__decorate([
    (0, common_1.Put)('today/progress'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_workout_progress_dto_1.UpdateWorkoutProgressDto]),
    __metadata("design:returntype", void 0)
], WorkoutController.prototype, "updateTodayProgress", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_workout_dto_1.CreateWorkoutDto]),
    __metadata("design:returntype", void 0)
], WorkoutController.prototype, "createWorkout", null);
exports.WorkoutController = WorkoutController = __decorate([
    (0, common_1.Controller)(['api/v1/workouts', 'api/workouts']),
    __metadata("design:paramtypes", [workout_service_1.WorkoutService, workout_plan_service_1.WorkoutPlanService])
], WorkoutController);
//# sourceMappingURL=workout.controller.js.map