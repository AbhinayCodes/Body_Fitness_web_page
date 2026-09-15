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
exports.SaveOnboardingDto = void 0;
const class_validator_1 = require("class-validator");
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
class SaveOnboardingDto {
    age;
    sex;
    heightCm;
    weightKg;
    primaryGoal;
    secondaryGoal;
    secondaryGoals;
    trainingExperience;
    trainingDays;
    workoutDurationMinutes;
    trainingLocation;
    equipment;
    dietType;
    foodPreferences;
    foodRestrictions;
    wakeTime;
    workSchedule;
    preferredGymTime;
    sleepTime;
    dailyActivity;
    currentStep;
    completed;
}
exports.SaveOnboardingDto = SaveOnboardingDto;
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.age !== undefined),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(13),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], SaveOnboardingDto.prototype, "age", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.sex !== undefined),
    (0, class_validator_1.IsIn)(['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "sex", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.heightCm !== undefined),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(100),
    (0, class_validator_1.Max)(250),
    __metadata("design:type", Number)
], SaveOnboardingDto.prototype, "heightCm", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.weightKg !== undefined),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(25),
    (0, class_validator_1.Max)(350),
    __metadata("design:type", Number)
], SaveOnboardingDto.prototype, "weightKg", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.primaryGoal !== undefined),
    (0, class_validator_1.IsIn)(['Build muscle', 'Lose fat', 'Maintain fitness']),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "primaryGoal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "secondaryGoal", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsIn)(['Improve strength', 'Improve endurance', 'Improve mobility', 'Build consistency'], { each: true }),
    __metadata("design:type", Array)
], SaveOnboardingDto.prototype, "secondaryGoals", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.trainingExperience !== undefined),
    (0, class_validator_1.IsIn)(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "trainingExperience", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.trainingDays !== undefined),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.IsIn)(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], { each: true }),
    __metadata("design:type", Array)
], SaveOnboardingDto.prototype, "trainingDays", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.workoutDurationMinutes !== undefined),
    (0, class_validator_1.IsIn)([30, 45, 60, 90]),
    __metadata("design:type", Number)
], SaveOnboardingDto.prototype, "workoutDurationMinutes", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.trainingLocation !== undefined),
    (0, class_validator_1.IsIn)(['HOME', 'GYM', 'OUTDOOR', 'MIXED']),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "trainingLocation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SaveOnboardingDto.prototype, "equipment", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.dietType !== undefined),
    (0, class_validator_1.IsIn)(['Vegetarian', 'Non-vegetarian', 'Vegan', 'No preference']),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "dietType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SaveOnboardingDto.prototype, "foodPreferences", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SaveOnboardingDto.prototype, "foodRestrictions", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.wakeTime !== undefined),
    (0, class_validator_1.Matches)(timePattern),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "wakeTime", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.workSchedule !== undefined),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "workSchedule", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.preferredGymTime !== undefined),
    (0, class_validator_1.Matches)(timePattern),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "preferredGymTime", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((value) => value.completed || value.sleepTime !== undefined),
    (0, class_validator_1.Matches)(timePattern),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "sleepTime", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE']),
    __metadata("design:type", String)
], SaveOnboardingDto.prototype, "dailyActivity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(6),
    __metadata("design:type", Number)
], SaveOnboardingDto.prototype, "currentStep", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SaveOnboardingDto.prototype, "completed", void 0);
//# sourceMappingURL=save-onboarding.dto.js.map