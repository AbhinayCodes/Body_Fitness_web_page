import { describe, expect, it } from '@jest/globals';
import { assessMedicalNutrition } from './medical-nutrition';

describe('assessMedicalNutrition', () => {
  it('refers when a doctor has restricted the diet', () => {
    const result = assessMedicalNutrition({ doctorDietRestrictions: 'yes' });
    expect(result.requiresMedicalNutritionSupport).toBe(true);
    expect(result.reasons[0]).toMatch(/doctor/i);
  });

  it.each(['diabetes', 'heart', 'blood_pressure', 'pregnancy'])('refers for nutrition-sensitive condition %s', (condition) => {
    const result = assessMedicalNutrition({ healthConditions: [condition] });
    expect(result.requiresMedicalNutritionSupport).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('does not refer for conditions that do not change nutrition safety', () => {
    expect(assessMedicalNutrition({ healthConditions: ['asthma'] }).requiresMedicalNutritionSupport).toBe(false);
    expect(assessMedicalNutrition({ healthConditions: ['other'] }).requiresMedicalNutritionSupport).toBe(false);
  });

  it('does not refer when no health flags are present', () => {
    expect(assessMedicalNutrition({}).requiresMedicalNutritionSupport).toBe(false);
    expect(assessMedicalNutrition(null).requiresMedicalNutritionSupport).toBe(false);
    expect(assessMedicalNutrition({ doctorDietRestrictions: 'no', healthConditions: [] }).requiresMedicalNutritionSupport).toBe(false);
  });

  it('collects multiple reasons', () => {
    const result = assessMedicalNutrition({ doctorDietRestrictions: 'yes', healthConditions: ['diabetes', 'heart'] });
    expect(result.reasons.length).toBe(3);
  });
});
