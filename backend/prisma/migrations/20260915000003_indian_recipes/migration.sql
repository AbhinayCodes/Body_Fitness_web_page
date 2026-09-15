CREATE TYPE "RecipeMealCategory" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'PRE_WORKOUT', 'POST_WORKOUT');
CREATE TYPE "RecipeDietType" AS ENUM ('VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN');

CREATE TABLE "Recipe" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mealCategory" "RecipeMealCategory" NOT NULL,
  "dietType" "RecipeDietType" NOT NULL,
  "regionalCuisines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preparationMinutes" INTEGER NOT NULL,
  "servingDescription" TEXT NOT NULL,
  "servingGrams" INTEGER,
  "calories" INTEGER NOT NULL,
  "proteinGrams" DECIMAL(6,1) NOT NULL,
  "carbohydrateGrams" DECIMAL(6,1) NOT NULL,
  "fatGrams" DECIMAL(6,1) NOT NULL,
  "fiberGrams" DECIMAL(6,1) NOT NULL,
  "allergens" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preparationSteps" TEXT[] NOT NULL,
  "nutritionBasis" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ingredient" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "standardUnit" TEXT NOT NULL,
  "caloriesPer100g" DECIMAL(7,2),
  "proteinGramsPer100g" DECIMAL(6,2),
  "carbohydrateGramsPer100g" DECIMAL(6,2),
  "fatGramsPer100g" DECIMAL(6,2),
  "fiberGramsPer100g" DECIMAL(6,2),
  "nutritionSource" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeIngredient" (
  "recipeId" UUID NOT NULL,
  "ingredientId" UUID NOT NULL,
  "quantity" DECIMAL(8,2) NOT NULL,
  "unit" TEXT NOT NULL,
  CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("recipeId", "ingredientId")
);

CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
CREATE INDEX "Recipe_dietType_mealCategory_idx" ON "Recipe"("dietType", "mealCategory");
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;