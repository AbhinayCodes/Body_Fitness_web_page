// Config-driven dynamic onboarding schema.
// Questions, options, conditional visibility and validation live here as data so the
// questionnaire can grow without rewriting the renderer or the storage layer.

export type ProfileCategory =
  | 'core'
  | 'body'
  | 'goal'
  | 'training'
  | 'lifestyle'
  | 'nutrition'
  | 'health'
  | 'preferences';

export type QuestionKind = 'single' | 'multi' | 'number' | 'text' | 'time';

export type AnswerValue = string | number | boolean | string[] | null;

export type OnboardingResponses = Record<string, AnswerValue>;

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

/** A single predicate against a previously answered question. */
export interface Condition {
  questionId: string;
  in?: string[];
  notIn?: string[];
  equals?: string | number | boolean;
  /** true => question must be answered (and not skipped); false => must be unanswered. */
  exists?: boolean;
}

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  label: string;
  help?: string;
  placeholder?: string;
  unit?: string;
  options?: QuestionOption[];
  /** Field may be left blank / skipped without blocking progress. */
  optional?: boolean;
  /** Show an explicit skip control (implies optional). */
  allowSkip?: boolean;
  skipLabel?: string;
  /** Max selections for `multi`. */
  maxSelections?: number;
  /** All conditions must pass (AND). */
  conditions?: Condition[];
  /** Any condition passes (OR). Combined with `conditions` as (AND of conditions) AND (OR of conditionsAny). */
  conditionsAny?: Condition[];
  validation?: ValidationRule;
}

export interface Section {
  id: string;
  title: string;
  subtitle?: string;
  category: ProfileCategory;
  questions: Question[];
  /** Section-level visibility (all must pass). */
  conditions?: Condition[];
}

export interface Questionnaire {
  version: number;
  sections: Section[];
}
