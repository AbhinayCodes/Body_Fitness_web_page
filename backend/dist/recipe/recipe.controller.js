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
exports.RecipeController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const list_recipes_dto_1 = require("./dto/list-recipes.dto");
const recipe_servings_dto_1 = require("./dto/recipe-servings.dto");
const recipe_service_1 = require("./recipe.service");
let RecipeController = class RecipeController {
    recipeService;
    constructor(recipeService) {
        this.recipeService = recipeService;
    }
    list(filters) { return this.recipeService.list(filters); }
    getBySlug(slug, query) {
        return this.recipeService.getBySlug(slug, query.servings ?? 1);
    }
};
exports.RecipeController = RecipeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_recipes_dto_1.ListRecipesDto]),
    __metadata("design:returntype", void 0)
], RecipeController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, recipe_servings_dto_1.RecipeServingsDto]),
    __metadata("design:returntype", void 0)
], RecipeController.prototype, "getBySlug", null);
exports.RecipeController = RecipeController = __decorate([
    (0, common_1.Controller)('api/v1/recipes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [recipe_service_1.RecipeService])
], RecipeController);
//# sourceMappingURL=recipe.controller.js.map