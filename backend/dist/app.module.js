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
const config_1 = require("@nestjs/config");
const activity_module_1 = require("./activity/activity.module");
const auth_module_1 = require("./auth/auth.module");
const env_validation_1 = require("./config/env.validation");
const data_access_module_1 = require("./data-access/data-access.module");
const meal_module_1 = require("./meal/meal.module");
const nutrition_module_1 = require("./nutrition/nutrition.module");
const onboarding_module_1 = require("./onboarding/onboarding.module");
const profile_module_1 = require("./profile/profile.module");
const recipe_module_1 = require("./recipe/recipe.module");
const progress_module_1 = require("./progress/progress.module");
const state_module_1 = require("./state/state.module");
const schedule_module_1 = require("./schedule/schedule.module");
const workout_module_1 = require("./workout/workout.module");
const today_module_1 = require("./today/today.module");
const reminder_module_1 = require("./reminder/reminder.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, validate: env_validation_1.validateEnvironment }),
            auth_module_1.AuthModule,
            data_access_module_1.DataAccessModule,
            onboarding_module_1.OnboardingModule,
            activity_module_1.ActivityModule,
            state_module_1.StateModule,
            profile_module_1.ProfileModule,
            workout_module_1.WorkoutModule,
            meal_module_1.MealModule,
            nutrition_module_1.NutritionModule,
            recipe_module_1.RecipeModule,
            progress_module_1.ProgressModule,
            schedule_module_1.ScheduleModule,
            today_module_1.TodayModule,
            reminder_module_1.ReminderModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map