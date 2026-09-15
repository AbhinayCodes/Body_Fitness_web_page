"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const data_access_module_1 = require("./data-access/data-access.module");
const meal_module_1 = require("./meal/meal.module");
const profile_module_1 = require("./profile/profile.module");
const state_module_1 = require("./state/state.module");
const workout_module_1 = require("./workout/workout.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({ imports: [data_access_module_1.DataAccessModule, state_module_1.StateModule, profile_module_1.ProfileModule, workout_module_1.WorkoutModule, meal_module_1.MealModule] })
], AppModule);
//# sourceMappingURL=app.module.js.map