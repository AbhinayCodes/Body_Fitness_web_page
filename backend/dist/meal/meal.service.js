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
exports.MealService = void 0;
const common_1 = require("@nestjs/common");
const fitness_state_repository_1 = require("../data-access/fitness-state.repository");
let MealService = class MealService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async createMeal(payload) {
        const entry = {
            date: new Date().toISOString().slice(0, 10),
            meal: payload.meal ?? 'Paneer rice bowl',
        };
        await this.repository.updateState((state) => {
            state.mealDone = true;
            state.mealHistory.push(entry);
        });
        return entry;
    }
};
exports.MealService = MealService;
exports.MealService = MealService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [fitness_state_repository_1.FitnessStateRepository])
], MealService);
//# sourceMappingURL=meal.service.js.map