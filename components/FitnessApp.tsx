'use client';

import { useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { Modal } from '@/components/Modal';
import { Nav } from '@/components/Nav';
import { OnboardingModal } from '@/components/OnboardingModal';
import { CalendarPage, DietPage, ProfilePage, ProgressPage, WorkoutPage } from '@/components/PlanPages';
import { useFitnessState } from '@/hooks/useFitnessState';
import type { Profile, View } from '@/types/fitness';

const titles: Record<Exclude<View, 'dashboard'>, string> = { workout: 'Workout plan', diet: 'Nutrition plan', calendar: 'Your calendar', progress: 'Progress overview', profile: 'Your profile' };

export default function FitnessApp() {
  const { state, update, updateProfile, isLoading, error, clearError, logMeal, logWorkout, saveProfile } = useFitnessState();
  const [saving, setSaving] = useState(false);

  const toggleExercise = (index: number) => update({ exerciseDone: state.exerciseDone.includes(index) ? state.exerciseDone.filter((item) => item !== index) : [...state.exerciseDone, index] });
  const completeWorkout = () => {
    if (state.exerciseDone.length < 5) {
      update({ exerciseDone: [...new Set([...state.exerciseDone, state.exerciseDone.length])] });
      return;
    }
    void logWorkout(state.exerciseDone);
  };
  const nextOnboardingStep = () => {
    if (state.step < 4) update({ step: state.step + 1 });
    else {
      update({ modal: null });
      setSaving(true);
      void saveProfile().finally(() => setSaving(false));
    }
  };
  const openOnboarding = () => update({ modal: 'onboarding', step: 1 });
  const pageTitle = state.view === 'dashboard' ? '' : titles[state.view];

  return <>
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark" />formwell</a>
        <div className="nav-label">Your space</div>
        <Nav active={state.view} onNavigate={(view) => update({ view })} />
        <div className="nav-label" style={{ marginTop: 34 }}>Account</div><nav className="nav"><button onClick={() => update({ view: 'profile' })}><span className="nav-icon">○</span>Profile</button><button><span className="nav-icon">⚙</span>Settings</button></nav>
        <div className="sidebar-bottom"><div className="avatar">RK</div><div><span className="user-name">{state.profile.name} Kumar</span><span className="user-meta">Build muscle · Week 06</span></div></div>
      </aside>
      <main className="main">{(isLoading || error || saving) && <div className={`api-status ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error ?? (saving ? 'Saving your plan...' : 'Loading your plan...')}{error && <button aria-label="Dismiss message" onClick={clearError}>×</button>}</div>}{state.view === 'dashboard' ? <Dashboard profile={state.profile} mealDone={state.mealDone} onWorkout={() => update({ modal: 'workout' })} onMeal={() => void logMeal()} /> : <PageView view={state.view} title={pageTitle} profile={state.profile} mealDone={state.mealDone} exerciseDone={state.exerciseDone} onEdit={openOnboarding} onMeal={() => void logMeal()} onToggle={toggleExercise} onComplete={completeWorkout} onNavigate={(view) => update({ view })} />}</main>
      <Nav active={state.view} onNavigate={(view) => update({ view })} mobile />
    </div>
    {state.modal === 'onboarding' ? <OnboardingModal onClose={() => update({ modal: null })} /> : <Modal type={state.modal} profile={state.profile} step={state.step} done={state.exerciseDone} mealDone={state.mealDone} onClose={() => update({ modal: null })} onToggle={toggleExercise} onComplete={completeWorkout} onMeal={() => void logMeal()} onNext={nextOnboardingStep} onProfile={updateProfile} />}
  </>;
}

function PageView({ view, title, profile, mealDone, exerciseDone, onEdit, onMeal, onToggle, onComplete }: { view: Exclude<View, 'dashboard'>; title: string; profile: Profile; mealDone: boolean; exerciseDone: number[]; onEdit: () => void; onMeal: () => void; onToggle: (index: number) => void; onComplete: () => void; onNavigate: (view: View) => void }) {
  return <><div className="topbar"><span className="eyebrow">Formwell / {title}</span><span className="date">{profile.name} Kumar</span></div><section className="greeting"><div><span className="eyebrow">Personalized for your life</span><h1>{title}<br /><em>kept simple.</em></h1></div><button className="primary dark-button" onClick={onEdit}>Edit my plan</button></section><div className="grid"><article className="card">{view === 'workout' ? <WorkoutPage done={exerciseDone} onToggle={onToggle} onComplete={onComplete} /> : view === 'diet' ? <DietPage mealDone={mealDone} onMeal={onMeal} /> : view === 'progress' ? <ProgressPage /> : view === 'profile' ? <ProfilePage profile={profile} onEdit={onEdit} /> : <CalendarPage />}</article><article className="card nutrition"><div className="card-title"><h2>Today at a glance</h2></div><div className="macro-total">82 <span>consistency score</span></div><div className="progress-bar"><i style={{ width: '82%' }} /></div><p className="subtle" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Small actions compound. Your plan adapts around the life you actually live.</p></article></div></>;
}
