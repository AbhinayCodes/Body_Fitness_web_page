// Canonical dietary-safety layer (pure, no Nest/Prisma).
//
// Normalises user-entered food restrictions (allergies, intolerances, cultural/religious
// restrictions, preferences) onto the uppercase allergen tokens used by the recipe catalog,
// classifies recipes by animal food group, and decides diet/allergen compatibility.
//
// Design rules (see PHASE1_NUTRITION_SAFETY_REPORT.md):
// - Normalisation is case-insensitive and whitespace-tolerant.
// - Restrictions that map to a known allergen are ENFORCED by filtering.
// - Restrictions we recognise but cannot enforce with catalog metadata (e.g. Jain, Halal,
//   Kosher, Low-carb) and restrictions we do not recognise at all are returned separately so
//   the caller can surface a notice. They are NEVER silently treated as safe.
// - We do not invent allergen data: ingredient-level detection only uses high-confidence
//   ingredient names and is unioned with the catalog's curated `allergens` array.

// Allergen tokens that exist (or could exist) in the recipe catalog.
export const ALLERGEN_TOKENS = ['DAIRY', 'GLUTEN', 'EGG', 'FISH', 'SHELLFISH', 'SOY', 'PEANUT', 'TREE_NUT'] as const;
export type AllergenToken = (typeof ALLERGEN_TOKENS)[number];
const ALLERGEN_SET = new Set<string>(ALLERGEN_TOKENS);

// Synonyms / spellings a user may type or pick, mapped to canonical allergen tokens.
// Keys are lowercase and whitespace-normalised.
const ALLERGEN_SYNONYMS: Record<string, AllergenToken[]> = {
  // Dairy
  dairy: ['DAIRY'], 'dairy-free': ['DAIRY'], 'dairy free': ['DAIRY'], 'no dairy': ['DAIRY'], lactose: ['DAIRY'], 'lactose intolerant': ['DAIRY'], 'lactose intolerance': ['DAIRY'], milk: ['DAIRY'], cheese: ['DAIRY'], paneer: ['DAIRY'], curd: ['DAIRY'], yogurt: ['DAIRY'], yoghurt: ['DAIRY'], ghee: ['DAIRY'], butter: ['DAIRY'], cream: ['DAIRY'], casein: ['DAIRY'], whey: ['DAIRY'],
  // Gluten
  gluten: ['GLUTEN'], 'gluten-free': ['GLUTEN'], 'gluten free': ['GLUTEN'], 'no gluten': ['GLUTEN'], wheat: ['GLUTEN'], barley: ['GLUTEN'], rye: ['GLUTEN'], maida: ['GLUTEN'],
  // Egg
  egg: ['EGG'], eggs: ['EGG'], 'egg-free': ['EGG'], 'egg free': ['EGG'],
  // Fish / shellfish
  fish: ['FISH'], seafood: ['FISH', 'SHELLFISH'], shellfish: ['SHELLFISH'], shrimp: ['SHELLFISH'], shrimps: ['SHELLFISH'], prawn: ['SHELLFISH'], prawns: ['SHELLFISH'], crab: ['SHELLFISH'], lobster: ['SHELLFISH'],
  // Soy
  soy: ['SOY'], soya: ['SOY'], 'soy-free': ['SOY'], 'soy free': ['SOY'], soybean: ['SOY'], soybeans: ['SOY'], tofu: ['SOY'], edamame: ['SOY'],
  // Peanut
  peanut: ['PEANUT'], peanuts: ['PEANUT'], groundnut: ['PEANUT'], groundnuts: ['PEANUT'], 'peanut butter': ['PEANUT'],
  // Tree nut
  'tree nut': ['TREE_NUT'], 'tree nuts': ['TREE_NUT'], treenut: ['TREE_NUT'], 'tree-nut': ['TREE_NUT'], almond: ['TREE_NUT'], almonds: ['TREE_NUT'], cashew: ['TREE_NUT'], cashews: ['TREE_NUT'], walnut: ['TREE_NUT'], walnuts: ['TREE_NUT'], pistachio: ['TREE_NUT'], pistachios: ['TREE_NUT'], hazelnut: ['TREE_NUT'], hazelnuts: ['TREE_NUT'],
  // Ambiguous "nut(s)": exclude both peanut and tree nut for safety.
  nut: ['PEANUT', 'TREE_NUT'], nuts: ['PEANUT', 'TREE_NUT'], 'nut-free': ['PEANUT', 'TREE_NUT'], 'nut free': ['PEANUT', 'TREE_NUT'], 'nut allergy': ['PEANUT', 'TREE_NUT'],
};

// Recognised restrictions that are NOT allergens and that the catalog lacks metadata to enforce.
// Acknowledged (not unknown) but surfaced as "not automatically enforced".
const RECOGNISED_NON_ENFORCEABLE = new Set<string>(['low-carb', 'low carb', 'lowcarb', 'keto', 'ketogenic', 'low-fat', 'low fat', 'low-sodium', 'low sodium', 'sugar-free', 'sugar free', 'jain', 'halal', 'kosher', 'high-protein', 'high protein']);

// Values that mean "no restriction" and should be ignored entirely.
const EMPTY_VALUES = new Set<string>(['', 'none', 'no preference', 'na', 'n/a', 'nil']);

function canonicalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Resolve a single restriction string to allergen tokens, if any. */
function resolveAllergens(raw: string): AllergenToken[] {
  const key = canonicalise(raw);
  if (ALLERGEN_SET.has(raw.trim().toUpperCase())) return [raw.trim().toUpperCase() as AllergenToken];
  if (ALLERGEN_SYNONYMS[key]) return [...ALLERGEN_SYNONYMS[key]];
  // Word-level fallback for free text like "peanuts, shellfish" or "almond milk".
  const words = key.split(/[^a-z]+/).filter(Boolean);
  const matched = new Set<AllergenToken>();
  for (const word of words) {
    if (ALLERGEN_SYNONYMS[word]) ALLERGEN_SYNONYMS[word].forEach((token) => matched.add(token));
  }
  return [...matched];
}

export interface NormalizedRestrictions {
  /** Allergen tokens that will be enforced by filtering. */
  allergens: Set<AllergenToken>;
  /** Restrictions recognised but not enforceable with current catalog metadata (e.g. Jain, Halal, Low-carb). */
  unsupported: string[];
  /** Restrictions we could not interpret at all. */
  unrecognised: string[];
}

/**
 * Normalise a user's raw restriction list into enforceable allergen tokens plus the buckets we
 * cannot enforce. Nothing is silently dropped: anything not mapped to an allergen is surfaced.
 */
export function normalizeRestrictions(raw: string[] | null | undefined): NormalizedRestrictions {
  const allergens = new Set<AllergenToken>();
  const unsupported: string[] = [];
  const unrecognised: string[] = [];
  for (const entry of raw ?? []) {
    if (typeof entry !== 'string') continue;
    const key = canonicalise(entry);
    if (!key || EMPTY_VALUES.has(key)) continue;
    const tokens = resolveAllergens(entry);
    if (tokens.length) {
      tokens.forEach((token) => allergens.add(token));
    } else if (RECOGNISED_NON_ENFORCEABLE.has(key)) {
      unsupported.push(entry.trim());
    } else {
      unrecognised.push(entry.trim());
    }
  }
  return { allergens, unsupported, unrecognised };
}

/** Human-readable safety notices for restrictions that are acknowledged but not auto-enforced. */
export function restrictionNotices(normalized: NormalizedRestrictions): string[] {
  const notices: string[] = [];
  if (normalized.unsupported.length) notices.push(`We could not automatically enforce these restrictions from the recipe catalog, so please review meals yourself: ${normalized.unsupported.join(', ')}.`);
  if (normalized.unrecognised.length) notices.push(`We did not recognise these restrictions and could not filter for them automatically — please review meals yourself or contact support: ${normalized.unrecognised.join(', ')}.`);
  return notices;
}

// High-confidence ingredient-name keywords -> allergen tokens. Deliberately narrow to avoid false
// positives (e.g. "gram flour"/besan is not gluten), and unioned with the recipe's curated allergens.
const INGREDIENT_ALLERGEN_KEYWORDS: Array<[RegExp, AllergenToken]> = [
  [/paneer|cheese|curd|yogurt|yoghurt|\bmilk\b|ghee|butter|cream|whey|casein/, 'DAIRY'],
  [/\begg\b|eggs/, 'EGG'],
  [/\bfish\b/, 'FISH'],
  [/prawn|shrimp|crab|lobster/, 'SHELLFISH'],
  [/\bsoy\b|soya|tofu|edamame/, 'SOY'],
  [/peanut|groundnut/, 'PEANUT'],
  [/almond|cashew|walnut|pistachio|hazelnut/, 'TREE_NUT'],
  [/\bwheat\b/, 'GLUTEN'],
];

function ingredientAllergenTokens(ingredientNames: string[]): Set<AllergenToken> {
  const tokens = new Set<AllergenToken>();
  for (const name of ingredientNames) {
    const lower = name.toLowerCase();
    for (const [pattern, token] of INGREDIENT_ALLERGEN_KEYWORDS) if (pattern.test(lower)) tokens.add(token);
  }
  return tokens;
}

export interface RecipeSafetyView {
  dietType: string;
  allergens: string[];
  ingredientNames?: string[];
}

/** Catalog allergens (normalised to canonical tokens) unioned with high-confidence ingredient detection. */
export function recipeAllergenTokens(recipe: RecipeSafetyView): Set<AllergenToken> {
  const tokens = new Set<AllergenToken>();
  for (const allergen of recipe.allergens ?? []) {
    const upper = String(allergen).trim().toUpperCase();
    if (ALLERGEN_SET.has(upper)) tokens.add(upper as AllergenToken);
  }
  if (recipe.ingredientNames?.length) ingredientAllergenTokens(recipe.ingredientNames).forEach((token) => tokens.add(token));
  return tokens;
}

/** True when a recipe contains any of the restricted allergen tokens. */
export function recipeViolatesAllergens(recipe: RecipeSafetyView, allergens: Set<AllergenToken>): boolean {
  if (!allergens.size) return false;
  const recipeTokens = recipeAllergenTokens(recipe);
  for (const token of allergens) if (recipeTokens.has(token)) return true;
  return false;
}

export interface FoodGroups { hasMeat: boolean; hasFish: boolean; hasEgg: boolean; }

const MEAT_KEYWORDS = /chicken|mutton|lamb|goat|beef|pork|bacon|ham\b|turkey|\bmeat\b/;

/**
 * Classify a recipe's animal food groups. Prefers reliable ingredient names; falls back to
 * dietType + allergen tags when ingredient data is unavailable (e.g. in unit tests).
 */
export function classifyFoodGroups(recipe: RecipeSafetyView): FoodGroups {
  const names = recipe.ingredientNames ?? [];
  const allergenTokens = recipeAllergenTokens(recipe);
  if (names.length) {
    const lower = names.map((name) => name.toLowerCase());
    return {
      hasMeat: lower.some((name) => MEAT_KEYWORDS.test(name)),
      hasFish: lower.some((name) => /\bfish\b|prawn|shrimp|crab|lobster/.test(name)) || allergenTokens.has('FISH') || allergenTokens.has('SHELLFISH'),
      hasEgg: lower.some((name) => /\begg\b|eggs/.test(name)) || allergenTokens.has('EGG'),
    };
  }
  // Fallback: infer from diet type and allergen tags only.
  const hasEgg = allergenTokens.has('EGG');
  const hasFish = allergenTokens.has('FISH') || allergenTokens.has('SHELLFISH');
  const hasMeat = recipe.dietType === 'NON_VEGETARIAN' && !hasEgg && !hasFish;
  return { hasMeat, hasFish, hasEgg };
}

export type UserDiet = 'Vegan' | 'Vegetarian' | 'Eggetarian' | 'Non-vegetarian' | 'No preference';

/**
 * Diet compatibility with an explicit, consistent policy:
 * - Vegan: vegan recipes only.
 * - Vegetarian: vegetarian or vegan; never meat, fish, or egg.
 * - Eggetarian: vegetarian or vegan, plus egg-containing recipes; never meat or fish.
 * - Non-vegetarian / No preference: anything.
 */
export function dietCompatible(recipe: RecipeSafetyView, userDiet: string): boolean {
  const diet = recipe.dietType;
  switch (userDiet) {
    case 'Vegan':
      return diet === 'VEGAN';
    case 'Vegetarian': {
      if (diet !== 'VEGAN' && diet !== 'VEGETARIAN') return false;
      // Defend against a mis-tagged recipe that still contains meat, fish, or egg.
      const groups = classifyFoodGroups(recipe);
      return !groups.hasMeat && !groups.hasFish && !groups.hasEgg;
    }
    case 'Eggetarian': {
      if (diet === 'VEGAN' || diet === 'VEGETARIAN') {
        const groups = classifyFoodGroups(recipe);
        return !groups.hasMeat && !groups.hasFish;
      }
      const groups = classifyFoodGroups(recipe);
      return groups.hasEgg && !groups.hasMeat && !groups.hasFish;
    }
    case 'Non-vegetarian':
    case 'No preference':
    default:
      return ['VEGAN', 'VEGETARIAN', 'NON_VEGETARIAN'].includes(diet);
  }
}
