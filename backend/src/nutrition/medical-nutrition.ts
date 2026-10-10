// Determines whether a user's reported health profile means the app cannot safely produce a
// generic nutrition target and must instead route to a professional (MEDICAL_REFERRAL).
//
// Policy (pure, conservative, non-diagnostic — see PHASE1_NUTRITION_SAFETY_REPORT.md):
// - A doctor-imposed dietary restriction is always deferred to the professional; the app does not
//   reconstruct a doctor's prescription.
// - Conditions whose safe nutrition management genuinely depends on individualised medical input
//   (diabetes, heart condition, high blood pressure, pregnancy/postpartum) are referred, because
//   the app has no validated disease-specific nutrition rules and generic macros could be unsafe.
// - Conditions that do not materially change nutrition safety (e.g. asthma) do NOT trigger referral.
// - We do not assume every condition needs the same diet, and we do not invent disease-specific diets.

export const NUTRITION_SENSITIVE_CONDITIONS = ['diabetes', 'heart', 'blood_pressure', 'pregnancy'] as const;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

const CONDITION_LABELS: Record<string, string> = {
  diabetes: 'diabetes',
  heart: 'a heart condition',
  blood_pressure: 'high blood pressure',
  pregnancy: 'pregnancy or postpartum',
};

export interface MedicalNutritionAssessment {
  requiresMedicalNutritionSupport: boolean;
  reasons: string[];
}

/** Assess medical nutrition support needs from the persisted onboarding `responses` JSON. */
export function assessMedicalNutrition(responses: Record<string, unknown> | null | undefined): MedicalNutritionAssessment {
  const data = responses ?? {};
  const reasons: string[] = [];
  if (data.doctorDietRestrictions === 'yes') reasons.push('A doctor has restricted your diet.');
  const conditions = asStringArray(data.healthConditions);
  for (const condition of NUTRITION_SENSITIVE_CONDITIONS) {
    if (conditions.includes(condition)) reasons.push(`A reported health condition (${CONDITION_LABELS[condition] ?? condition}) needs individualised nutrition guidance.`);
  }
  return { requiresMedicalNutritionSupport: reasons.length > 0, reasons };
}
