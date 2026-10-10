// Live validation against the DEPLOYED backend (same engine/DB/cache the UI consumes).
import { writeFileSync } from 'node:fs';
const API = 'https://formwell-api.onrender.com';
const PHONE = '9100000007';

async function http(method, path, token, body) {
  const res = await fetch(API + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, json };
}

const base = {
  age: 25, sex: 'MALE', heightCm: 180, weightKg: 75,
  primaryGoal: 'Build muscle', trainingExperience: 'INTERMEDIATE',
  trainingDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'], workoutDurationMinutes: 60,
  trainingLocation: 'GYM', dietType: 'Vegetarian', foodPreferences: [], foodRestrictions: [],
  wakeTime: '06:30', workSchedule: 'Office day shift', preferredGymTime: '18:00', sleepTime: '22:30',
  dailyActivity: 'MODERATELY_ACTIVE', completed: true, currentStep: 6,
};

const scenarios = {
  P1_vegetarian_muscle_75_moderate: { ...base },
  P2_fat_loss: { ...base, primaryGoal: 'Lose fat' },
  P3_weight_90: { ...base, weightKg: 90 },
  P4_sedentary: { ...base, dailyActivity: 'SEDENTARY' },
  DIET_vegetarian: { ...base },
  DIET_vegan: { ...base, dietType: 'Vegan' },
  DIET_nonveg: { ...base, dietType: 'Non-vegetarian' },
  ALLERGY_DAIRY_upper: { ...base, dietType: 'Non-vegetarian', foodRestrictions: ['DAIRY'] },
  ALLERGY_dairy_lower: { ...base, dietType: 'Non-vegetarian', foodRestrictions: ['dairy'] },
};

const num = (v) => Math.round(Number(v) * 10) / 10;

async function run() {
  const login = await http('POST', '/api/v1/auth/phone-login', null, { phoneNumber: PHONE });
  const token = login.json?.token;
  const result = { base, api: API, phone: PHONE, loginStatus: login.status, scenarios: {}, weekly: {} };
  if (!token) { result.error = 'LOGIN FAILED'; writeFileSync('validation/live-results.json', JSON.stringify(result, null, 2)); console.log('LOGIN FAILED', login.status, JSON.stringify(login.json)); return; }

  for (const [name, profile] of Object.entries(scenarios)) {
    const save = await http('PUT', '/api/v1/onboarding', token, profile);
    const today = await http('GET', '/api/v1/today', token);
    const t = today.json;
    const targets = t?.nutrition?.targets ?? null;
    const meta = t?.nutrition?.metadata ?? null;
    const meals = (t?.schedule?.meals ?? []).map((m) => ({
      slot: m.slot, name: m.recipe?.name, dietType: m.recipe?.dietType, allergens: m.recipe?.allergens,
      servings: Number(m.servings), targetCalories: m.targetCalories,
      actual: m.actualNutrition,
      perServing: { calories: m.recipe?.calories, protein: num(m.recipe?.proteinGrams), carbs: num(m.recipe?.carbohydrateGrams), fat: num(m.recipe?.fatGrams), fiber: num(m.recipe?.fiberGrams) },
    }));
    result.scenarios[name] = { saveStatus: save.status, todayStatus: today.status, dietType: profile.dietType, restrictions: profile.foodRestrictions,
      targets, bmr: meta?.basalEnergyRequirement, tdee: meta?.estimatedDailyEnergyExpenditure, activityMultiplier: meta?.activityMultiplier, goalAdjustment: meta?.goalAdjustmentCalories,
      summary: t?.schedule?.nutritionSummary ?? null, meals };
  }

  // Weekly: load twice for stability, compute per-day actuals from recipe x servings.
  const vegForWeek = await http('PUT', '/api/v1/onboarding', token, { ...base });
  const w1 = await http('GET', '/api/v1/schedule/week', token);
  const w1b = await http('GET', '/api/v1/schedule/week', token);
  const digest = (week) => (week.json?.days ?? []).map((d) => ({ date: d.date, isTrainingDay: d.schedule?.isTrainingDay,
    meals: (d.schedule?.meals ?? []).map((m) => `${m.slot}:${m.recipe?.name} x${Number(m.servings)}`),
    actual: (d.schedule?.meals ?? []).reduce((s, m) => ({
      calories: s.calories + Math.round((m.recipe?.calories ?? 0) * Number(m.servings)),
      protein: s.protein + num((m.recipe?.proteinGrams ?? 0) * Number(m.servings)),
      carbs: s.carbs + num((m.recipe?.carbohydrateGrams ?? 0) * Number(m.servings)),
      fat: s.fat + num((m.recipe?.fatGrams ?? 0) * Number(m.servings)),
      fiber: s.fiber + num((m.recipe?.fiberGrams ?? 0) * Number(m.servings)),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }) }));
  const d1 = digest(w1); const d2 = digest(w1b);
  result.weekly = { saveStatus: vegForWeek.status, week1: d1, reloadIdentical: JSON.stringify(d1) === JSON.stringify(d2),
    breakfasts: d1.map((d) => d.meals.find((x) => x.startsWith('BREAKFAST'))),
    lunches: d1.map((d) => d.meals.find((x) => x.startsWith('LUNCH'))),
    dinners: d1.map((d) => d.meals.find((x) => x.startsWith('DINNER'))) };

  writeFileSync('validation/live-results.json', JSON.stringify(result, null, 2), 'utf8');

  // Console summary
  for (const [name, s] of Object.entries(result.scenarios)) {
    console.log(`\n=== ${name} (${s.dietType}${s.restrictions?.length ? ' / restrict ' + s.restrictions.join(',') : ''}) ===`);
    if (!s.targets) { console.log('  NO TARGETS', s.todayStatus, JSON.stringify(s.summary)); continue; }
    console.log(`  TARGET: ${s.targets.calories}kcal P${s.targets.proteinGrams} C${s.targets.carbohydrateGrams} F${s.targets.fatGrams} fib${s.targets.fiberGrams} | BMR ${s.bmr} TDEE ${s.tdee} x${s.activityMultiplier} adj${s.goalAdjustment}`);
    for (const m of s.meals) console.log(`   ${m.slot}: ${m.name} x${m.servings} = ${m.actual?.calories}kcal P${m.actual?.proteinGrams} C${m.actual?.carbohydrateGrams} F${m.actual?.fatGrams} fib${m.actual?.fiberGrams} [allergens ${(m.allergens||[]).join(',')||'none'}]`);
    const sm = s.summary;
    if (sm) console.log(`  ACTUAL: ${sm.calories.actual}kcal (${sm.calories.percentDifference}%) P${sm.proteinGrams.actual}(${sm.proteinGrams.percentDifference}%) C${sm.carbohydrateGrams.actual}(${sm.carbohydrateGrams.percentDifference}%) F${sm.fatGrams.actual}(${sm.fatGrams.percentDifference}%) fib${sm.fiberGrams.actual}(${sm.fiberGrams.percentDifference}%) within=${sm.withinTolerance}`);
  }
  console.log('\n=== WEEKLY (vegetarian base) ===');
  console.log('reload identical:', result.weekly.reloadIdentical);
  for (const d of result.weekly.week1) console.log(` ${d.date} ${d.isTrainingDay ? 'TRAIN' : 'rest '} ${d.actual.calories}kcal P${d.actual.protein} | ${d.meals.join(' | ')}`);
  console.log('\nBreakfasts:', result.weekly.breakfasts.join(' // '));
  console.log('Lunches:', result.weekly.lunches.join(' // '));
  console.log('Dinners:', result.weekly.dinners.join(' // '));
}
run().catch((e) => { console.log('ERROR', e?.message); writeFileSync('validation/live-results-error.txt', String(e?.stack || e)); });
