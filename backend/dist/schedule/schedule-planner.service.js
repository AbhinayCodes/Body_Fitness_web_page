"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulePlanningError = exports.SchedulePlannerService = void 0;
exports.parseTime = parseTime;
const common_1 = require("@nestjs/common");
const mealMinutes = { BREAKFAST: 60, LUNCH: 45, SNACK: 20, DINNER: 45, PRE_WORKOUT: 15, POST_WORKOUT: 30 };
let SchedulePlannerService = class SchedulePlannerService {
    generate(input, recipes) {
        const wake = parseTime(input.wakeTime);
        const sleep = nextDayTime(parseTime(input.sleepTime), wake);
        if (sleep - wake < 8 * 60)
            throw new SchedulePlanningError('Wake and sleep times must allow at least eight hours awake.');
        const candidates = [
            { slot: 'BREAKFAST', time: wake + 60, share: 0.27 },
            { slot: 'LUNCH', time: Math.round((wake + sleep) / 2), share: 0.32 },
            { slot: 'DINNER', time: sleep - 120, share: 0.31 },
        ];
        if (input.isTrainingDay && input.gymTime) {
            const gym = alignTime(parseTime(input.gymTime), wake, sleep);
            const pre = gym - 75;
            const post = gym + input.workoutDurationMinutes + 30;
            if (pre >= wake + 45)
                candidates.push({ slot: 'PRE_WORKOUT', time: pre, share: 0.12 });
            if (post <= sleep - 45)
                candidates.push({ slot: 'POST_WORKOUT', time: post, share: 0.25 });
        }
        const spaced = candidates.sort((left, right) => left.time - right.time).filter((candidate, index, list) => index === 0 || candidate.time - list[index - 1].time >= 120);
        const totalShares = spaced.reduce((total, meal) => total + meal.share, 0);
        const meals = spaced.map((meal) => this.recipeFor(meal.slot, meal.time, Math.round(input.targets.calories * meal.share / totalShares), input, recipes));
        return { meals };
    }
    recipeFor(slot, scheduledMinutes, targetCalories, input, recipes) {
        const compatible = recipes.filter((recipe) => dietCompatible(recipe.dietType, input.dietType) && !recipe.allergens.some((allergen) => input.restrictions.includes(allergen)));
        const categoryMatches = compatible.filter((recipe) => recipe.mealCategory === slot);
        const pool = (categoryMatches.length ? categoryMatches : compatible).sort((left, right) => Math.abs(left.calories - targetCalories) - Math.abs(right.calories - targetCalories) || left.name.localeCompare(right.name));
        if (!pool.length)
            throw new SchedulePlanningError(`No recipes match the user's diet and restrictions for ${slot}.`);
        return { slot, scheduledMinutes, targetCalories, recipeId: pool[0].id, alternativeRecipeIds: pool.slice(1, 3).map((recipe) => recipe.id) };
    }
};
exports.SchedulePlannerService = SchedulePlannerService;
exports.SchedulePlannerService = SchedulePlannerService = __decorate([
    (0, common_1.Injectable)()
], SchedulePlannerService);
class SchedulePlanningError extends Error {
}
exports.SchedulePlanningError = SchedulePlanningError;
function parseTime(value) { const match = /^(\d{2}):(\d{2})$/.exec(value); if (!match || Number(match[1]) > 23 || Number(match[2]) > 59)
    throw new SchedulePlanningError('Times must use HH:MM format.'); return Number(match[1]) * 60 + Number(match[2]); }
function nextDayTime(time, wake) { return time <= wake ? time + 1440 : time; }
function alignTime(time, wake, sleep) { const aligned = time < wake ? time + 1440 : time; if (aligned < wake || aligned > sleep)
    throw new SchedulePlanningError('Workout time must fall between wake and sleep.'); return aligned; }
function dietCompatible(recipeDiet, userDiet) { return userDiet === 'Vegan' ? recipeDiet === 'VEGAN' : userDiet === 'Vegetarian' ? ['VEGETARIAN', 'VEGAN'].includes(recipeDiet) : ['VEGETARIAN', 'VEGAN', 'NON_VEGETARIAN'].includes(recipeDiet); }
//# sourceMappingURL=schedule-planner.service.js.map