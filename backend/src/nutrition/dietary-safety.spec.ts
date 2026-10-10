import { describe, expect, it } from '@jest/globals';
import { classifyFoodGroups, dietCompatible, normalizeRestrictions, recipeAllergenTokens, recipeViolatesAllergens, restrictionNotices, type RecipeSafetyView } from './dietary-safety';

// Mirrors how catalog recipes look to the safety layer (uppercase allergen tokens + ingredient names).
const paneerBowl: RecipeSafetyView = { dietType: 'VEGETARIAN', allergens: ['DAIRY'], ingredientNames: ['Paneer', 'Rice, cooked', 'Mixed vegetables', 'Cooking oil'] };
const eggBhurji: RecipeSafetyView = { dietType: 'NON_VEGETARIAN', allergens: ['EGG', 'GLUTEN'], ingredientNames: ['Egg', 'Whole wheat flour', 'Onion', 'Tomato', 'Cooking oil'] };
const chickenBowl: RecipeSafetyView = { dietType: 'NON_VEGETARIAN', allergens: [], ingredientNames: ['Chicken breast, cooked', 'Rice, cooked', 'Mixed vegetables', 'Cooking oil'] };
const fishCurry: RecipeSafetyView = { dietType: 'NON_VEGETARIAN', allergens: ['FISH'], ingredientNames: ['Fish, cooked', 'Rice, cooked', 'Tomato', 'Onion'] };
const veganPoha: RecipeSafetyView = { dietType: 'VEGAN', allergens: ['PEANUT'], ingredientNames: ['Poha (flattened rice)', 'Potato', 'Peanuts', 'Cooking oil'] };
const besanChilla: RecipeSafetyView = { dietType: 'VEGAN', allergens: [], ingredientNames: ['Besan (gram flour)', 'Onion', 'Tomato', 'Cooking oil'] };

describe('normalizeRestrictions', () => {
  it('maps uppercase, lowercase, mixed-case and whitespace to the same allergen token', () => {
    for (const value of ['DAIRY', 'dairy', 'Dairy', '  DaIrY  ']) {
      expect([...normalizeRestrictions([value]).allergens]).toEqual(['DAIRY']);
    }
  });

  it('maps UI chips and synonyms to canonical allergen tokens', () => {
    expect([...normalizeRestrictions(['Dairy-free']).allergens]).toEqual(['DAIRY']);
    expect([...normalizeRestrictions(['lactose']).allergens]).toEqual(['DAIRY']);
    expect([...normalizeRestrictions(['Gluten-free']).allergens]).toEqual(['GLUTEN']);
    expect([...normalizeRestrictions(['wheat']).allergens]).toEqual(['GLUTEN']);
    expect([...normalizeRestrictions(['peanuts']).allergens]).toEqual(['PEANUT']);
    expect([...normalizeRestrictions(['groundnut']).allergens]).toEqual(['PEANUT']);
    expect([...normalizeRestrictions(['almonds']).allergens]).toEqual(['TREE_NUT']);
    expect([...normalizeRestrictions(['soya']).allergens]).toEqual(['SOY']);
  });

  it('expands ambiguous "nuts" to both peanut and tree nut for safety', () => {
    expect([...normalizeRestrictions(['nuts']).allergens].sort()).toEqual(['PEANUT', 'TREE_NUT']);
  });

  it('handles multiple simultaneous restrictions and free-text word lists', () => {
    const result = normalizeRestrictions(['dairy', 'Gluten-free', 'peanuts, shellfish']);
    expect([...result.allergens].sort()).toEqual(['DAIRY', 'GLUTEN', 'PEANUT', 'SHELLFISH']);
  });

  it('ignores empty / none markers', () => {
    const result = normalizeRestrictions(['None', '', 'No preference']);
    expect(result.allergens.size).toBe(0);
    expect(result.unrecognised).toEqual([]);
  });

  it('surfaces recognised-but-unenforceable restrictions instead of treating them as safe', () => {
    const result = normalizeRestrictions(['Jain', 'Halal', 'Low-carb']);
    expect(result.allergens.size).toBe(0);
    expect(result.unsupported.sort()).toEqual(['Halal', 'Jain', 'Low-carb']);
    expect(restrictionNotices(result)[0]).toMatch(/could not automatically enforce/i);
  });

  it('surfaces unknown restrictions as unrecognised, never silently safe', () => {
    const result = normalizeRestrictions(['xyzzy allergy']);
    expect(result.allergens.size).toBe(0);
    expect(result.unrecognised).toEqual(['xyzzy allergy']);
    expect(restrictionNotices(result).some((notice) => /did not recognise/i.test(notice))).toBe(true);
  });
});

describe('recipe allergen detection', () => {
  it('reads curated uppercase tokens and unions high-confidence ingredient detection', () => {
    expect([...recipeAllergenTokens(paneerBowl)].sort()).toEqual(['DAIRY']);
    // Missing curated tag is still caught from the ingredient name.
    const untagged: RecipeSafetyView = { dietType: 'VEGETARIAN', allergens: [], ingredientNames: ['Paneer', 'Rice, cooked'] };
    expect(recipeAllergenTokens(untagged).has('DAIRY')).toBe(true);
  });

  it('does not misclassify gram flour (besan) as gluten', () => {
    expect(recipeAllergenTokens(besanChilla).has('GLUTEN')).toBe(false);
  });

  it('blocks an incompatible recipe for a matching restriction regardless of case', () => {
    const dairy = normalizeRestrictions(['dairy']).allergens;
    expect(recipeViolatesAllergens(paneerBowl, dairy)).toBe(true);
    expect(recipeViolatesAllergens(besanChilla, dairy)).toBe(false);
  });

  it('returns false when there are no restrictions', () => {
    expect(recipeViolatesAllergens(paneerBowl, new Set())).toBe(false);
  });
});

describe('classifyFoodGroups', () => {
  it('detects egg, fish and meat from ingredient names', () => {
    expect(classifyFoodGroups(eggBhurji)).toEqual({ hasMeat: false, hasFish: false, hasEgg: true });
    expect(classifyFoodGroups(fishCurry).hasFish).toBe(true);
    expect(classifyFoodGroups(chickenBowl)).toEqual({ hasMeat: true, hasFish: false, hasEgg: false });
    expect(classifyFoodGroups(veganPoha)).toEqual({ hasMeat: false, hasFish: false, hasEgg: false });
  });

  it('falls back to diet type + allergens when ingredient names are absent', () => {
    expect(classifyFoodGroups({ dietType: 'NON_VEGETARIAN', allergens: ['EGG'] })).toMatchObject({ hasEgg: true, hasMeat: false, hasFish: false });
    expect(classifyFoodGroups({ dietType: 'NON_VEGETARIAN', allergens: [] })).toMatchObject({ hasMeat: true });
  });
});

describe('dietCompatible', () => {
  it('vegan accepts only vegan recipes', () => {
    expect(dietCompatible(veganPoha, 'Vegan')).toBe(true);
    expect(dietCompatible(paneerBowl, 'Vegan')).toBe(false);
    expect(dietCompatible(eggBhurji, 'Vegan')).toBe(false);
  });

  it('vegetarian excludes meat, fish and egg', () => {
    expect(dietCompatible(paneerBowl, 'Vegetarian')).toBe(true);
    expect(dietCompatible(veganPoha, 'Vegetarian')).toBe(true);
    expect(dietCompatible(eggBhurji, 'Vegetarian')).toBe(false);
    expect(dietCompatible(chickenBowl, 'Vegetarian')).toBe(false);
    expect(dietCompatible(fishCurry, 'Vegetarian')).toBe(false);
  });

  it('eggetarian accepts egg dishes but never meat or fish', () => {
    expect(dietCompatible(eggBhurji, 'Eggetarian')).toBe(true);
    expect(dietCompatible(paneerBowl, 'Eggetarian')).toBe(true);
    expect(dietCompatible(veganPoha, 'Eggetarian')).toBe(true);
    expect(dietCompatible(chickenBowl, 'Eggetarian')).toBe(false);
    expect(dietCompatible(fishCurry, 'Eggetarian')).toBe(false);
  });

  it('non-vegetarian and no preference accept everything', () => {
    for (const diet of ['Non-vegetarian', 'No preference']) {
      expect(dietCompatible(chickenBowl, diet)).toBe(true);
      expect(dietCompatible(eggBhurji, diet)).toBe(true);
      expect(dietCompatible(paneerBowl, diet)).toBe(true);
    }
  });
});
