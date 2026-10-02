import type { OnboardingData } from '@/types/fitness';
import { PREFER_NOT, SKIP, UNKNOWN, questionnaire } from './questionnaire';
import type { AnswerValue, Condition, OnboardingResponses, Question, Section } from './types';

const SKIP_SENTINELS = new Set([SKIP, UNKNOWN, PREFER_NOT]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A value counts as answered when it holds real content (not blank, empty, or an explicit skip). */
export function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0 && !SKIP_SENTINELS.has(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

function evaluateCondition(condition: Condition, responses: OnboardingResponses): boolean {
  const value = responses[condition.questionId];
  if (condition.exists !== undefined) return isAnswered(value) === condition.exists;
  if (condition.equals !== undefined) return value === condition.equals;
  const asList = Array.isArray(value) ? value : value === null || value === undefined ? [] : [String(value)];
  if (condition.in) return asList.some((item) => condition.in!.includes(String(item)));
  if (condition.notIn) return !asList.some((item) => condition.notIn!.includes(String(item)));
  return true;
}

export function isQuestionVisible(question: Question, responses: OnboardingResponses): boolean {
  if (question.conditions && !question.conditions.every((condition) => evaluateCondition(condition, responses))) return false;
  if (question.conditionsAny && !question.conditionsAny.some((condition) => evaluateCondition(condition, responses))) return false;
  return true;
}

export function getVisibleQuestions(section: Section, responses: OnboardingResponses): Question[] {
  return section.questions.filter((question) => isQuestionVisible(question, responses));
}

export function isSectionVisible(section: Section, responses: OnboardingResponses): boolean {
  if (section.conditions && !section.conditions.every((condition) => evaluateCondition(condition, responses))) return false;
  return getVisibleQuestions(section, responses).length > 0;
}

export function getVisibleSections(responses: OnboardingResponses): Section[] {
  return questionnaire.sections.filter((section) => isSectionVisible(section, responses));
}

function isOptional(question: Question): boolean {
  return Boolean(question.optional || question.allowSkip);
}

/** Returns an error message for a single question, or null when it is acceptable. */
export function validateQuestion(question: Question, responses: OnboardingResponses): string | null {
  const value = responses[question.id];
  const answered = isAnswered(value);
  if (!answered) return isOptional(question) ? null : `Please answer: ${question.label}.`;
  if (question.kind === 'number' && typeof value === 'number') {
    const { min, max, message } = question.validation ?? {};
    if ((min !== undefined && value < min) || (max !== undefined && value > max)) return message ?? `Enter a valid value for ${question.label}.`;
  }
  if (question.kind === 'time' && typeof value === 'string' && !TIME_PATTERN.test(value)) return `Enter a valid time for ${question.label}.`;
  if (question.kind === 'multi' && question.maxSelections && Array.isArray(value) && value.length > question.maxSelections) return `Select up to ${question.maxSelections} for ${question.label}.`;
  return null;
}

/** First validation error across a section's currently-visible questions. */
export function validateSection(section: Section, responses: OnboardingResponses): string | null {
  for (const question of getVisibleQuestions(section, responses)) {
    const error = validateQuestion(question, responses);
    if (error) return error;
  }
  return null;
}

/** Fraction (0..1) of currently-visible questions that are answered or acceptably skipped. */
export function computeProgress(responses: OnboardingResponses): number {
  const questions = getVisibleSections(responses).flatMap((section) => getVisibleQuestions(section, responses));
  if (!questions.length) return 0;
  const done = questions.filter((question) => isAnswered(responses[question.id]) || isOptional(question)).length;
  return done / questions.length;
}

const GOAL_TO_LEGACY: Record<string, OnboardingData['primaryGoal']> = {
  build_muscle: 'Build muscle',
  lean_muscle: 'Build muscle',
  strength: 'Build muscle',
  lose_fat: 'Lose fat',
  maintain: 'Maintain fitness',
  endurance: 'Maintain fitness',
  athletic: 'Maintain fitness',
};

const DIET_TO_LEGACY: Record<string, OnboardingData['dietType']> = {
  vegetarian: 'Vegetarian',
  eggetarian: 'Vegetarian',
  non_vegetarian: 'Non-vegetarian',
  vegan: 'Vegan',
  other: 'No preference',
};

function asString(value: AnswerValue | undefined): string | undefined {
  return typeof value === 'string' && isAnswered(value) ? value : undefined;
}
function asNumber(value: AnswerValue | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}
function asArray(value: AnswerValue | undefined): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
function splitText(value: AnswerValue | undefined): string[] {
  const text = asString(value);
  return text ? text.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

/** Flag when responses indicate automated recommendations may be inappropriate without professional input. */
export function needsMedicalAttention(responses: OnboardingResponses): boolean {
  const conditions = asArray(responses.healthConditions);
  const flaggedCondition = conditions.some((item) => ['heart', 'blood_pressure', 'pregnancy'].includes(item));
  return flaggedCondition || responses.doctorExerciseRestrictions === 'yes';
}

/**
 * Projects the rich, extensible responses onto the legacy flat fields the existing
 * calorie/workout/schedule engines consume. Only defined values are emitted, so drafts
 * stay valid against the backend DTO and nothing downstream has to change.
 */
export function mapResponsesToLegacy(responses: OnboardingResponses): Partial<OnboardingData> {
  const legacy: Partial<OnboardingData> = {};
  const set = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K] | undefined) => {
    if (value !== undefined) legacy[key] = value;
  };

  set('age', asNumber(responses.age));
  set('sex', asString(responses.sex) as OnboardingData['sex']);
  set('heightCm', asNumber(responses.heightCm));
  set('weightKg', asNumber(responses.weightKg));

  const goal = asString(responses.primaryGoal);
  if (goal === 'recomp') {
    const balance = asString(responses.recompBalance);
    set('primaryGoal', balance === 'muscle' ? 'Build muscle' : balance === 'fat' ? 'Lose fat' : 'Maintain fitness');
  } else if (goal) {
    set('primaryGoal', GOAL_TO_LEGACY[goal]);
  }

  const secondaryGoals = asArray(responses.secondaryGoals) as OnboardingData['secondaryGoals'];
  if (secondaryGoals && secondaryGoals.length) set('secondaryGoals', secondaryGoals);

  set('trainingExperience', asString(responses.trainingExperience) as OnboardingData['trainingExperience']);
  const trainingDays = asArray(responses.trainingDays);
  if (trainingDays.length) set('trainingDays', trainingDays);
  set('workoutDurationMinutes', asNumber(responses.workoutDurationMinutes));
  set('trainingLocation', asString(responses.trainingLocation) as OnboardingData['trainingLocation']);

  const equipment = [...asArray(responses.homeEquipment), ...asArray(responses.gymEquipment)].filter((item) => item !== 'None');
  if (equipment.length) set('equipment', Array.from(new Set(equipment)));

  const diet = asString(responses.dietType);
  if (diet) set('dietType', DIET_TO_LEGACY[diet]);

  const foodPreferences = asArray(responses.foodPreferences);
  if (foodPreferences.length) set('foodPreferences', foodPreferences);

  const restrictions = [
    ...asArray(responses.dietaryRestrictions).filter((item) => item !== 'None'),
    ...splitText(responses.allergies),
    ...splitText(responses.intolerances),
  ];
  if (restrictions.length) set('foodRestrictions', Array.from(new Set(restrictions)));

  set('wakeTime', asString(responses.wakeTime));
  set('workSchedule', asString(responses.workSchedule));
  set('preferredGymTime', asString(responses.preferredGymTime));
  set('sleepTime', asString(responses.sleepTime));
  set('dailyActivity', asString(responses.dailyActivity) as OnboardingData['dailyActivity']);

  return legacy;
}
