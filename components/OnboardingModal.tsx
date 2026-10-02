'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Dumbbell, Moon, Sunrise, type LucideIcon } from 'lucide-react';
import { ApiError, clearDemoOnboarding, fitnessApi, getDemoOnboarding } from '@/lib/api';
import type { OnboardingData } from '@/types/fitness';
import { ONBOARDING_SCHEMA_VERSION, SKIP, questionnaire } from '@/lib/onboarding/questionnaire';
import {
  computeProgress,
  getVisibleQuestions,
  getVisibleSections,
  isAnswered,
  mapResponsesToLegacy,
  needsMedicalAttention,
  validateSection,
} from '@/lib/onboarding/engine';
import type { AnswerValue, OnboardingResponses, Question } from '@/lib/onboarding/types';

const TIME_ICONS: Record<string, LucideIcon> = { wakeTime: Sunrise, preferredGymTime: Dumbbell, sleepTime: Moon };

export function OnboardingModal({ onClose, onCompleted, required = false }: { onClose: () => void; onCompleted?: (data: OnboardingData) => void; required?: boolean }) {
  const [responses, setResponses] = useState<OnboardingResponses>({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fitnessApi.getOnboarding().then((saved) => {
      const draft = !saved.age && !saved.responses ? getDemoOnboarding<OnboardingData>() : null;
      const restored = draft ?? saved;
      setResponses(restored.responses ?? {});
      const resume = restored.completed ? 0 : Math.max(0, (restored.currentStep ?? 1) - 1);
      setStep(Math.min(resume, questionnaire.sections.length));
    }).catch(() => setError('Unable to load your saved setup.')).finally(() => setLoading(false));
  }, []);

  const sections = useMemo(() => getVisibleSections(responses), [responses]);
  const reviewStep = sections.length;
  const onReview = step >= reviewStep;
  const section = sections[step];
  const progress = computeProgress(responses);

  const setResponse = (id: string, value: AnswerValue) => setResponses((current) => ({ ...current, [id]: value }));
  const toggleMulti = (id: string, value: string) => setResponses((current) => {
    const existing = Array.isArray(current[id]) ? (current[id] as string[]) : [];
    return { ...current, [id]: existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value] };
  });

  const persist = async (nextStep: number, completed = false): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const payload: OnboardingData = { ...mapResponsesToLegacy(responses), responses, schemaVersion: ONBOARDING_SCHEMA_VERSION, currentStep: nextStep + 1, completed };
      await fitnessApi.saveOnboarding(payload);
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
    const message = section ? validateSection(section, responses) : null;
    if (message) return setError(message);
    await persist(step + 1);
  };
  const back = async () => { if (step > 0) await persist(step - 1); };
  const finish = async () => {
    for (const visible of sections) {
      const message = validateSection(visible, responses);
      if (message) { setError(message); return; }
    }
    if (await persist(reviewStep, true)) {
      onCompleted?.({ ...mapResponsesToLegacy(responses), responses, completed: true });
      onClose();
    }
  };

  if (loading) return <div className="modal-backdrop"><div className="modal">Loading your setup...</div></div>;

  const age = typeof responses.age === 'number' ? responses.age : undefined;

  return <div className="modal-backdrop"><div className="modal onboarding-modal">
    <div className="modal-head">
      <div>
        <span className="eyebrow">Personal setup · Step {Math.min(step + 1, reviewStep + 1)} of {reviewStep + 1}</span>
        <h2>{onReview ? 'Review your profile.' : section?.title}</h2>
        {!onReview && section?.subtitle && <p className="muted">{section.subtitle}</p>}
      </div>
      {!required && <button className="close" aria-label="Close onboarding" onClick={onClose}>x</button>}
    </div>
    <div className="steps" aria-hidden="true">{sections.map((item, index) => <i className={index < step ? 'active' : ''} key={item.id} />)}<i className={onReview ? 'active' : ''} /></div>
    <div className="api-status" role="status">Profile completeness: {Math.round(progress * 100)}%</div>
    {error && <div className="api-status error" role="alert">{error}</div>}

    {!onReview && section && <div className="onboarding-questions">
      {getVisibleQuestions(section, responses).map((question) => (
        <QuestionField key={question.id} question={question} value={responses[question.id]} onSet={(value) => setResponse(question.id, value)} onToggle={(value) => toggleMulti(question.id, value)} />
      ))}
      {section.id === 'core' && age !== undefined && age < 18 && <div className="api-status" role="status">Your plan will focus on safe, age-appropriate movement and habits. It will not provide calorie targets, cutting guidance, or bodybuilding claims.</div>}
    </div>}

    {onReview && <>
      <Review responses={responses} />
      {needsMedicalAttention(responses) && <div className="api-status" role="status">Based on your health answers, some automated recommendations may not be appropriate. Please review your plan with a qualified healthcare professional before following it.</div>}
      {age !== undefined && age < 18 && <div className="api-status" role="status">Your profile is set up for age-appropriate movement and habit support only. Nutrition targets and aggressive body-composition guidance are not included.</div>}
    </>}

    <div className="modal-footer">
      {step > 0 ? <button className="outline" disabled={saving} onClick={() => void back()}>Back</button> : <span />}
      {onReview
        ? <button className="primary" disabled={saving} onClick={() => void finish()}>{saving ? 'Saving...' : 'Save my profile'}</button>
        : <button className="primary" disabled={saving} onClick={() => void next()}>{saving ? 'Saving...' : 'Next'}</button>}
    </div>
  </div></div>;
}

function QuestionField({ question, value, onSet, onToggle }: { question: Question; value: AnswerValue | undefined; onSet: (value: AnswerValue) => void; onToggle: (value: string) => void }) {
  const label = question.unit ? `${question.label} (${question.unit})` : question.label;
  const skipped = value === SKIP;

  if (question.kind === 'number') {
    return <div className="field full">
      <label>{label}</label>
      {question.help && <p className="muted">{question.help}</p>}
      <input type="number" disabled={skipped} value={typeof value === 'number' ? value : ''} placeholder={question.placeholder} onChange={(event) => onSet(event.target.value ? Number(event.target.value) : null)} />
      {question.allowSkip && <SkipChipRow question={question} skipped={skipped} onSet={onSet} />}
    </div>;
  }
  if (question.kind === 'text') {
    return <div className="field full">
      <label>{label}</label>
      {question.help && <p className="muted">{question.help}</p>}
      <input disabled={skipped} value={typeof value === 'string' && value !== SKIP ? value : ''} placeholder={question.placeholder} onChange={(event) => onSet(event.target.value)} />
      {question.allowSkip && <SkipChipRow question={question} skipped={skipped} onSet={onSet} />}
    </div>;
  }
  if (question.kind === 'time') {
    return <div className="field full">
      <label>{label}</label>
      <TimeField icon={TIME_ICONS[question.id] ?? Clock} value={typeof value === 'string' ? value : undefined} onChange={(time) => onSet(time)} ariaLabel={question.label} />
    </div>;
  }
  const selected = question.kind === 'multi' ? (Array.isArray(value) ? value : []) : [value];
  return <div className="field full">
    <label>{label}</label>
    {question.help && <p className="muted">{question.help}</p>}
    <div className="choices">
      {question.options?.map((option) => (
        <button type="button" key={option.value} className={`choice ${selected.includes(option.value) ? 'selected' : ''}`} title={option.description}
          onClick={() => question.kind === 'multi' ? onToggle(option.value) : onSet(option.value)}>
          {option.label}
        </button>
      ))}
      {question.allowSkip && <SkipChip question={question} skipped={skipped} onSet={onSet} />}
    </div>
  </div>;
}

function SkipChipRow({ question, skipped, onSet }: { question: Question; skipped: boolean; onSet: (value: AnswerValue) => void }) {
  return <div className="choices" style={{ marginTop: 8 }}><SkipChip question={question} skipped={skipped} onSet={onSet} /></div>;
}
function SkipChip({ question, skipped, onSet }: { question: Question; skipped: boolean; onSet: (value: AnswerValue) => void }) {
  return <button type="button" className={`choice ${skipped ? 'selected' : ''}`} onClick={() => onSet(skipped ? null : SKIP)}>{question.skipLabel ?? 'Skip'}</button>;
}

function TimeField({ icon: Icon, value, onChange, ariaLabel }: { icon: LucideIcon; value?: string; onChange: (value: string) => void; ariaLabel: string }) {
  const [draftMinute, setDraftMinute] = useState('00');
  const [draftPeriod, setDraftPeriod] = useState('AM');
  const hour = value ? String(Number(value.slice(0, 2)) % 12 || 12).padStart(2, '0') : '';
  const minute = value ? value.slice(3, 5) : draftMinute;
  const period = value ? (Number(value.slice(0, 2)) >= 12 ? 'PM' : 'AM') : draftPeriod;
  const change = (nextHour: string, nextMinute: string, nextPeriod: string) => {
    setDraftMinute(nextMinute);
    setDraftPeriod(nextPeriod);
    if (nextHour) onChange(`${String(Number(nextHour) % 12 + (nextPeriod === 'PM' ? 12 : 0)).padStart(2, '0')}:${nextMinute}`);
  };
  return <div className="routine-time" role="group" aria-label={ariaLabel}>
    <div className="routine-time-label"><span className="routine-time-icon"><Icon size={19} aria-hidden="true" /></span></div>
    <div className="time-controls">
      <div className="time-digits"><select aria-label={`${ariaLabel} hour`} value={hour} onChange={(event) => change(event.target.value, minute, period)}><option value="" disabled>--</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((item) => <option key={item} value={item}>{item}</option>)}</select><span aria-hidden="true">:</span><select aria-label={`${ariaLabel} minute`} value={minute} onChange={(event) => change(hour, event.target.value, period)}>{Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      <div className="time-period" role="group" aria-label={`${ariaLabel} period`}>{['AM', 'PM'].map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => change(hour, minute, item)}>{item}</button>)}</div>
    </div>
  </div>;
}

function formatValue(question: Question, value: AnswerValue): string {
  const labelFor = (raw: string) => question.options?.find((option) => option.value === raw)?.label ?? raw;
  if (Array.isArray(value)) return value.map(labelFor).join(', ');
  if (typeof value === 'string') return question.options ? labelFor(value) : value;
  return String(value);
}

function Review({ responses }: { responses: OnboardingResponses }) {
  const sections = getVisibleSections(responses);
  return <div className="onboarding-review">
    {sections.map((section) => {
      const answered = getVisibleQuestions(section, responses).filter((question) => isAnswered(responses[question.id]));
      if (!answered.length) return null;
      return <div className="schedule-list" key={section.id}>
        <div className="nav-label">{section.title}</div>
        {answered.map((question) => <div className="schedule-item" key={question.id}><span>{question.label}</span><b>{formatValue(question, responses[question.id]!)}</b></div>)}
      </div>;
    })}
  </div>;
}
