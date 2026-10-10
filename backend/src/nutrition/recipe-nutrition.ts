// Ingredient-level nutrition reconciliation (pure).
//
// Recipes in the catalog store curated per-serving macro values (what is displayed and persisted).
// The ingredient table additionally carries per-100g reference values. This utility recomputes a
// recipe's nutrition from its ingredient quantities so we can (a) verify stored values are coherent
// and (b) recalculate nutrition when an ingredient quantity changes. It never fabricates data: an
// ingredient with missing reference values is reported, not guessed.

export interface IngredientReference {
  caloriesPer100g: number | null;
  proteinGramsPer100g: number | null;
  carbohydrateGramsPer100g: number | null;
  fatGramsPer100g: number | null;
  fiberGramsPer100g: number | null;
}

export interface RecipeComponent { name: string; quantity: number; unit: string }

export interface ComputedNutrition {
  calories: number;
  proteinGrams: number;
  carbohydrateGrams: number;
  fatGrams: number;
  fiberGrams: number;
  missingIngredients: string[];
}

// 'g' and 'ml' are both treated as per-100 units (liquids here are ~1 g/ml). Unknown units are flagged.
export function computeRecipeNutritionFromIngredients(components: RecipeComponent[], references: Map<string, IngredientReference>): ComputedNutrition {
  const totals = { calories: 0, proteinGrams: 0, carbohydrateGrams: 0, fatGrams: 0, fiberGrams: 0 };
  const missingIngredients: string[] = [];
  for (const component of components) {
    const reference = references.get(component.name);
    if (!reference || reference.caloriesPer100g == null) { missingIngredients.push(component.name); continue; }
    if (component.unit !== 'g' && component.unit !== 'ml') { missingIngredients.push(`${component.name} (unit ${component.unit})`); continue; }
    const factor = component.quantity / 100;
    totals.calories += (reference.caloriesPer100g ?? 0) * factor;
    totals.proteinGrams += (reference.proteinGramsPer100g ?? 0) * factor;
    totals.carbohydrateGrams += (reference.carbohydrateGramsPer100g ?? 0) * factor;
    totals.fatGrams += (reference.fatGramsPer100g ?? 0) * factor;
    totals.fiberGrams += (reference.fiberGramsPer100g ?? 0) * factor;
  }
  return {
    calories: Math.round(totals.calories),
    proteinGrams: Math.round(totals.proteinGrams * 10) / 10,
    carbohydrateGrams: Math.round(totals.carbohydrateGrams * 10) / 10,
    fatGrams: Math.round(totals.fatGrams * 10) / 10,
    fiberGrams: Math.round(totals.fiberGrams * 10) / 10,
    missingIngredients,
  };
}

// Energy implied by stored macros (Atwater): protein/carb 4 kcal/g, fat 9 kcal/g. Fiber is not added.
export function macroImpliedCalories(macros: { proteinGrams: number; carbohydrateGrams: number; fatGrams: number }): number {
  return macros.proteinGrams * 4 + macros.carbohydrateGrams * 4 + macros.fatGrams * 9;
}
