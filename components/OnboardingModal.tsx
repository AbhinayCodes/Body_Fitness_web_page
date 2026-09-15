'use client';

import { useEffect, useState } from 'react';
import { ApiError, clearDemoOnboarding, fitnessApi, getDemoOnboarding } from '@/lib/api';
import type { OnboardingData } from '@/types/fitness';

const steps = ['Body', 'Goals', 'Training', 'Food', 'Routine', 'Review'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const defaults: OnboardingData = { trainingDays: [], equipment: [], foodPreferences: [], foodRestrictions: [], secondaryGoals: [], currentStep: 1, completed: false };

type ToggleKey = 'trainingDays' | 'equipment' | 'foodPreferences' | 'secondaryGoals';

export function OnboardingModal({ onClose, onCompleted, required = false }: { onClose: () => void; onCompleted?: (data: OnboardingData) => void; required?: boolean }) {
  const [data, setData] = useState<OnboardingData>(defaults);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fitnessApi.getOnboarding().then((saved) => {
      const draft = !saved.age ? getDemoOnboarding<OnboardingData>() : null;
      const restored = draft ?? saved;
      setData({ ...defaults, ...restored });
      setStep(restored.completed ? 1 : restored.currentStep ?? 1);
    }).catch(() => setError('Unable to load your saved setup.')).finally(() => setLoading(false));
  }, []);

  const update = (changes: Partial<OnboardingData>) => setData((current) => ({ ...current, ...changes }));
  const toggle = (key: ToggleKey, value: string) => update({
    [key]: data[key]?.includes(value as never) ? data[key]?.filter((item) => item !== value) : [...(data[key] ?? []), value],
  });
  const validationMessage = () => {
    if (step === 1 && (!data.age || data.age < 13 || data.age > 100 || !data.sex || !data.heightCm || data.heightCm < 100 || data.heightCm > 250 || !data.weightKg || data.weightKg < 25 || data.weightKg > 350)) return 'Enter a valid age, sex, height, and weight.';
    if (step === 2 && (!data.primaryGoal || !data.trainingExperience)) return 'Choose a primary goal and your training experience.';
    if (step === 3 && (!data.trainingDays?.length || !data.workoutDurationMinutes || !data.trainingLocation)) return 'Choose at least one day, a duration, and training location.';
    if (step === 4 && !data.dietType) return 'Choose your diet preference.';
    if (step === 5 && (!data.wakeTime || !data.workSchedule || !data.preferredGymTime || !data.sleepTime)) return 'Complete each part of your daily routine.';
    return null;
  };
  const save = async (nextStep: number, completed = false) => {
    setSaving(true);
    setError(null);
    try {
      const onboarding = { ...data, currentStep: nextStep, completed };
      await fitnessApi.saveOnboarding(onboarding);
      clearDemoOnboarding();
      setStep(nextStep);
      return true;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to save your setup. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const next = async () => {
    const message = validationMessage();
    if (message) return setError(message);
    await save(step + 1);
  };
  const back = async () => { if (step > 1) await save(step - 1); };
  const finish = async () => {
    if (await save(6, true)) {
      onCompleted?.({ ...data, completed: true });
      onClose();
    }
  };

  if (loading) return <div className="modal-backdrop"><div className="modal">Loading your setup...</div></div>;

  return <div className="modal-backdrop"><div className="modal onboarding-modal">
    <div className="modal-head"><div><span className="eyebrow">Personal setup: Step {step} of {steps.length}</span><h2>{step === 6 ? 'Review your details.' : 'Build around your life.'}</h2></div>{!required && <button className="close" aria-label="Close onboarding" onClick={onClose}>x</button>}</div>
    <div className="steps">{steps.map((label, index) => <i className={index < step ? 'active' : ''} key={label} />)}</div>
    {error && <div className="api-status error" role="alert">{error}</div>}
    {step === 1 && <><div className="form-grid"><NumberField label="Age" value={data.age} onChange={(age) => update({ age })} /><Choice label="Sex" values={['FEMALE', 'MALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']} selected={data.sex} onSelect={(sex) => update({ sex: sex as OnboardingData['sex'] })} /><NumberField label="Height (cm)" value={data.heightCm} onChange={(heightCm) => update({ heightCm })} /><NumberField label="Weight (kg)" value={data.weightKg} onChange={(weightKg) => update({ weightKg })} /></div>{data.age !== undefined && data.age < 18 && <div className="api-status" role="status">Your plan will focus on safe, age-appropriate movement and habits. It will not provide calorie targets, cutting guidance, or bodybuilding claims.</div>}</>}
    {step === 2 && <><Choice label="Primary fitness goal" values={['Build muscle', 'Lose fat', 'Maintain fitness']} selected={data.primaryGoal} onSelect={(primaryGoal) => update({ primaryGoal })} /><Choice label="Secondary goals (optional)" values={['Improve strength', 'Improve endurance', 'Improve mobility', 'Build consistency']} selected={data.secondaryGoals} onSelect={(goal) => toggle('secondaryGoals', goal)} multi /><Choice label="Training experience" values={['BEGINNER', 'INTERMEDIATE', 'ADVANCED']} selected={data.trainingExperience} onSelect={(trainingExperience) => update({ trainingExperience: trainingExperience as OnboardingData['trainingExperience'] })} /></>}
    {step === 3 && <><Choice label="Available training days" values={days} selected={data.trainingDays} onSelect={(day) => toggle('trainingDays', day)} multi /><Choice label="Workout duration" values={['30', '45', '60', '90']} selected={data.workoutDurationMinutes?.toString()} onSelect={(value) => update({ workoutDurationMinutes: Number(value) })} /><Choice label="Training location" values={['HOME', 'GYM', 'OUTDOOR', 'MIXED']} selected={data.trainingLocation} onSelect={(trainingLocation) => update({ trainingLocation: trainingLocation as OnboardingData['trainingLocation'] })} /><Choice label="Available equipment" values={['Dumbbells', 'Barbell', 'Resistance bands', 'Machines', 'Yoga mat', 'None']} selected={data.equipment} onSelect={(equipment) => toggle('equipment', equipment)} multi /></>}
    {step === 4 && <><Choice label="Diet preference" values={['Vegetarian', 'Non-vegetarian', 'Vegan', 'No preference']} selected={data.dietType} onSelect={(dietType) => update({ dietType })} /><Choice label="Food preferences" values={['High protein', 'Home cooked', 'Quick meals', 'Budget friendly']} selected={data.foodPreferences} onSelect={(preference) => toggle('foodPreferences', preference)} multi /><TextField label="Restrictions or allergies" value={data.foodRestrictions?.join(', ')} placeholder="For example: peanuts, lactose" onChange={(value) => update({ foodRestrictions: value.split(',').map((item) => item.trim()).filter(Boolean) })} /></>}
    {step === 5 && <div className="form-grid"><TimeField label="Wake time" value={data.wakeTime} onChange={(wakeTime) => update({ wakeTime })} /><Choice label="Work or college schedule" values={['Morning schedule', 'Afternoon schedule', 'Evening schedule', 'Rotating shifts', 'Flexible']} selected={data.workSchedule} onSelect={(workSchedule) => update({ workSchedule })} /><TimeField label="Preferred workout time" value={data.preferredGymTime} onChange={(preferredGymTime) => update({ preferredGymTime })} /><TimeField label="Sleep time" value={data.sleepTime} onChange={(sleepTime) => update({ sleepTime })} /><Choice label="Daily activity outside training (optional)" values={['SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE']} selected={data.dailyActivity} onSelect={(dailyActivity) => update({ dailyActivity: dailyActivity as OnboardingData['dailyActivity'] })} /></div>}
    {step === 6 && <><Review data={data} />{(data.age ?? 18) < 18 && <div className="api-status" role="status">Your profile is set up for age-appropriate movement and habit support only. Nutrition targets and aggressive body-composition guidance are not included.</div>}</>}
    <div className="modal-footer">{step > 1 ? <button className="outline" disabled={saving} onClick={() => void back()}>Back</button> : <span />}{step === 6 ? <button className="primary" disabled={saving} onClick={() => void finish()}>{saving ? 'Saving...' : 'Save my profile'}</button> : <button className="primary" disabled={saving} onClick={() => void next()}>{saving ? 'Saving...' : 'Next'}</button>}</div>
  </div></div>;
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) { return <div className="field"><label>{label}</label><input type="number" value={value ?? ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)} /></div>; }
function TextField({ label, value, placeholder, onChange }: { label: string; value?: string; placeholder?: string; onChange: (value: string) => void }) { return <div className="field full"><label>{label}</label><input value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>; }
function TimeField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <div className="field"><label>{label}</label><input type="time" value={value ?? ''} onChange={(event) => onChange(event.target.value)} /></div>; }
function Choice({ label, values, selected, onSelect, multi = false }: { label: string; values: string[]; selected?: string | string[]; onSelect: (value: string) => void; multi?: boolean }) { const selectedValues = multi ? (selected as string[] | undefined) ?? [] : [selected]; return <div className="field" style={{ marginTop: 18 }}><label>{label}</label><div className="choices">{values.map((value) => <button type="button" className={`choice ${selectedValues.includes(value) ? 'selected' : ''}`} key={value} onClick={() => onSelect(value)}>{value.replaceAll('_', ' ')}</button>)}</div></div>; }
function Review({ data }: { data: OnboardingData }) { const items = [['Body', `${data.age} | ${data.sex?.replaceAll('_', ' ')} | ${data.heightCm} cm | ${data.weightKg} kg`], ['Goals', [data.primaryGoal, ...(data.secondaryGoals ?? [])].filter(Boolean).join(' | ')], ['Training', `${data.trainingDays?.join(', ')} | ${data.workoutDurationMinutes} min | ${data.trainingLocation?.replaceAll('_', ' ')}`], ['Equipment', data.equipment?.join(', ') || 'Not specified'], ['Food', [data.dietType, ...(data.foodPreferences ?? [])].filter(Boolean).join(' | ')], ['Restrictions', data.foodRestrictions?.join(', ') || 'None'], ['Routine', `${data.wakeTime} wake | ${data.workSchedule} | ${data.preferredGymTime} workout | ${data.sleepTime} sleep`], ['Daily activity', data.dailyActivity?.replaceAll('_', ' ') || 'Estimated from training']]; return <div className="schedule-list">{items.map(([label, value]) => <div className="schedule-item" key={label}><span>{label}</span><b>{value}</b></div>)}</div>; }
