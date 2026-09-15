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
exports.RecipeService = void 0;
const common_1 = require("@nestjs/common");
const recipe_repository_1 = require("./recipe.repository");
let RecipeService = class RecipeService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async list(filters) {
        const recipes = await this.repository.findMany(filters);
        return recipes.map((recipe) => this.present(recipe, filters.servings ?? 1));
    }
    async getBySlug(slug, servings = 1) {
        const recipe = await this.repository.findBySlug(slug);
        if (!recipe)
            throw new common_1.NotFoundException('Recipe not found.');
        return this.present(recipe, servings);
    }
    present(recipe, servings) {
        const scale = (value) => Math.round(Number(value) * servings * 10) / 10;
        return {
            id: recipe.id,
            slug: recipe.slug,
            name: recipe.name,
            mealCategory: recipe.mealCategory,
            dietType: recipe.dietType,
            regionalCuisines: recipe.regionalCuisines,
            preparationMinutes: recipe.preparationMinutes,
            serving: { description: recipe.servingDescription, grams: recipe.servingGrams, count: servings },
            nutrition: { calories: Math.round(recipe.calories * servings), proteinGrams: scale(recipe.proteinGrams), carbohydrateGrams: scale(recipe.carbohydrateGrams), fatGrams: scale(recipe.fatGrams), fiberGrams: scale(recipe.fiberGrams), estimated: true, note: recipe.nutritionBasis },
            allergens: recipe.allergens,
            tags: recipe.tags,
            preparationSteps: recipe.preparationSteps,
            ingredients: recipe.ingredients.map(({ quantity, unit, ingredient }) => ({ name: ingredient.name, quantity: scale(quantity), unit })),
        };
    }
};
exports.RecipeService = RecipeService;
exports.RecipeService = RecipeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [recipe_repository_1.RecipeRepository])
], RecipeService);
//# sourceMappingURL=recipe.service.js.map