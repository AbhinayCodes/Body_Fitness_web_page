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
exports.TodayController = void 0;
const common_1 = require("@nestjs/common");
const authenticated_user_decorator_1 = require("../auth/authenticated-user.decorator");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const today_service_1 = require("./today.service");
let TodayController = class TodayController {
    today;
    constructor(today) {
        this.today = today;
    }
    get(userId) { return this.today.get(userId); }
};
exports.TodayController = TodayController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, authenticated_user_decorator_1.CurrentUserId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TodayController.prototype, "get", null);
exports.TodayController = TodayController = __decorate([
    (0, common_1.Controller)('api/v1/today'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [today_service_1.TodayService])
], TodayController);
//# sourceMappingURL=today.controller.js.map