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
exports.ListRecipesDto = exports.RecipeMealCategoryFilter = exports.RecipeDietFilter = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var RecipeDietFilter;
(function (RecipeDietFilter) {
    RecipeDietFilter["VEGETARIAN"] = "VEGETARIAN";
    RecipeDietFilter["NON_VEGETARIAN"] = "NON_VEGETARIAN";
    RecipeDietFilter["VEGAN"] = "VEGAN";
})(RecipeDietFilter || (exports.RecipeDietFilter = RecipeDietFilter = {}));
var RecipeMealCategoryFilter;
(function (RecipeMealCategoryFilter) {
    RecipeMealCategoryFilter["BREAKFAST"] = "BREAKFAST";
    RecipeMealCategoryFilter["LUNCH"] = "LUNCH";
    RecipeMealCategoryFilter["SNACK"] = "SNACK";
    RecipeMealCategoryFilter["DINNER"] = "DINNER";
    RecipeMealCategoryFilter["PRE_WORKOUT"] = "PRE_WORKOUT";
    RecipeMealCategoryFilter["POST_WORKOUT"] = "POST_WORKOUT";
})(RecipeMealCategoryFilter || (exports.RecipeMealCategoryFilter = RecipeMealCategoryFilter = {}));
class ListRecipesDto {
    dietType;
    mealCategory;
    restrictions;
    servings;
}
exports.ListRecipesDto = ListRecipesDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RecipeDietFilter),
    __metadata("design:type", String)
], ListRecipesDto.prototype, "dietType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(RecipeMealCategoryFilter),
    __metadata("design:type", String)
], ListRecipesDto.prototype, "mealCategory", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => Array.isArray(value) ? value.map((item) => String(item).trim().toUpperCase()) : String(value).split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ListRecipesDto.prototype, "restrictions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(5),
    __metadata("design:type", Number)
], ListRecipesDto.prototype, "servings", void 0);
//# sourceMappingURL=list-recipes.dto.js.map