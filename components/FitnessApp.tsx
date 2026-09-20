'use client';

import { useEffect, useState } from 'react';
import { AuthScreen } from '@/components/AuthScreen';
import { Dashboard } from '@/components/Dashboard';
import { Modal } from '@/components/Modal';
import { Nav } from '@/components/Nav';
import { OnboardingModal } from '@/components/OnboardingModal';
import { CalendarPage, DietPage, ProfilePage, ProgressPage, WorkoutPage } from '@/components/PlanPages';
import { useFitnessState } from '@/hooks/useFitnessState';
import { ApiError, clearAccessToken, clearDemoLogin, clearDemoOnboarding, fitnessApi, isOnboardingReady } from '@/lib/api';
import type { Profile, View } from '@/types/fitness';

const titles: Record<Exclude<View, 'dashboard'>, string> = { workout: 'Workout plan', diet: 'Nutrition plan', calendar: 'Your calendar', progress: 'Progress overview', profile: 'Your profile' };

export default function FitnessApp() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    fitnessApi.getCurrentUser().then(() => setAuthenticated(true)).catch(() => { clearAccessToken(); setAuthenticated(false); });
  }, []);
  if (authenticated === null) return <main className="auth-shell"><div className="auth-panel">Loading your session...</div></main>;
  if (!authenticated) return <AuthScreen onAuthenticated={() => setAuthenticated(true)} />;
  return <AuthenticatedFitnessApp onLogout={() => { clearAccessToken(); clearDemoLogin(); clearDemoOnboarding(); setAuthenticated(false); }} />;
}

function AuthenticatedFitnessApp({ onLogout }: { onLogout: () => void }) {
  const [setupStatus, setSetupStatus] = useState<'loading' | 'required' | 'ready'>('loading');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fitnessApi.getOnboarding().then((onboarding) => {
      if (active) setSetupStatus(isOnboardingReady(onboarding) ? 'ready' : 'required');
    }).catch((reason) => {
      if (active) setSetupError(reason instanceof ApiError ? reason.message : 'Unable to load your saved setup.');
    });
    return () => { active = false; };
  }, [attempt]);

  if (setupError) return <main className="auth-shell"><div className="auth-panel"><div className="api-status error" role="alert">{setupError}<button onClick={() => { setSetupError(null); setAttempt((current) => current + 1); }}>Retry</button></div><button className="outline" onClick={onLogout}>Log out</button></div></main>;
  if (setupStatus === 'loading') return <main className="auth-shell"><div className="auth-panel" role="status">Loading your setup...</div></main>;
  if (setupStatus === 'required') return <OnboardingModal required onCompleted={() => setSetupStatus('ready')} onClose={() => {}} />;
  return <ReadyFitnessApp onLogout={onLogout} />;
}

function ReadyFitnessApp({ onLogout }: { onLogout: () => void }) {
  const { state, update, updateProfile, isLoading, error, clearError, logMeal, logWorkout, saveProfile } = useFitnessState();
  const [saving, setSaving] = useState(false);
  const [planVersion, setPlanVersion] = useState(0);

  const toggleExercise = (index: number) => update({ exerciseDone: state.exerciseDone.includes(index) ? state.exerciseDone.filter((item) => item !== index) : [...state.exerciseDone, index] });
  const completeWorkout = () => void logWorkout(state.exerciseDone);
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
        <div className="nav-label" style={{ marginTop: 34 }}>Account</div><nav className="nav"><button onClick={() => update({ view: 'profile' })}><span className="nav-icon">○</span>Profile</button><button onClick={onLogout}><span className="nav-icon">↗</span>Log out</button></nav>
        <div className="sidebar-bottom"><div className="avatar">{state.profile.name.slice(0, 2).toUpperCase()}</div><div><span className="user-name">{state.profile.name}</span><span className="user-meta">{state.profile.goal} · {state.profile.days}</span></div></div>
      </aside>
      <main className="main">{(isLoading || error || saving) && <div className={`api-status ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{error ?? (saving ? 'Saving your plan...' : 'Loading your plan...')}{error && <button aria-label="Dismiss message" onClick={clearError}>×</button>}</div>}{state.view === 'dashboard' ? <Dashboard key={planVersion} profile={state.profile} onWorkout={() => update({ view: 'workout' })} onEdit={openOnboarding} /> : <PageView key={planVersion} view={state.view} title={pageTitle} profile={state.profile} mealDone={state.mealDone} exerciseDone={state.exerciseDone} onEdit={openOnboarding} onMeal={() => void logMeal()} onToggle={toggleExercise} onComplete={completeWorkout} onNavigate={(view) => update({ view })} />}</main>
      <Nav active={state.view} onNavigate={(view) => update({ view })} mobile />
    </div>
    {state.modal === 'onboarding' ? <OnboardingModal onCompleted={(onboarding) => { update({ profile: { ...state.profile, goal: onboarding.primaryGoal ?? state.profile.goal, days: `${onboarding.trainingDays?.length ?? 0} days / week`, diet: onboarding.dietType ?? state.profile.diet } }); setPlanVersion((current) => current + 1); }} onClose={() => update({ modal: null })} /> : <Modal type={state.modal} profile={state.profile} step={state.step} done={state.exerciseDone} mealDone={state.mealDone} onClose={() => update({ modal: null })} onToggle={toggleExercise} onComplete={completeWorkout} onMeal={() => void logMeal()} onNext={nextOnboardingStep} onProfile={updateProfile} />}
  </>;
}

function PageView({ view, title, profile, mealDone, exerciseDone, onEdit, onMeal, onToggle, onComplete }: { view: Exclude<View, 'dashboard'>; title: string; profile: Profile; mealDone: boolean; exerciseDone: number[]; onEdit: () => void; onMeal: () => void; onToggle: (index: number) => void; onComplete: () => void; onNavigate: (view: View) => void }) {
  return <><div className="topbar"><span className="eyebrow">Formwell / {title}</span><span className="date">{profile.name}</span></div><section className="greeting"><div><span className="eyebrow">Personalized for your life</span><h1>{title}<br /><em>kept simple.</em></h1></div><button className="primary dark-button" onClick={onEdit}>Edit my plan</button></section><div className="grid"><article className="card">{view === 'workout' ? <WorkoutPage /> : view === 'diet' ? <DietPage /> : view === 'progress' ? <ProgressPage /> : view === 'profile' ? <ProfilePage profile={profile} onEdit={onEdit} /> : <CalendarPage />}</article><article className="card nutrition"><div className="card-title"><h2>Your preferences</h2></div><div className="macro-row"><span>Goal</span><b>{profile.goal}</b></div><div className="macro-row"><span>Training</span><b>{profile.days}</b></div><div className="macro-row"><span>Food</span><b>{profile.diet}</b></div></article></div></>;
}
