'use client';

import { useEffect, useState } from 'react';
import { ApiError, fitnessApi } from '@/lib/api';
import type { ActivityToday, Profile, TodayExperience } from '@/types/fitness';

export function Dashboard({ profile, onWorkout, onEdit }: { profile: Profile; onWorkout: () => void; onEdit: () => void }) {
  const [today, setToday] = useState<TodayExperience | null>(null);
  const [activity, setActivity] = useState<ActivityToday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setError(null);
    try { const [todayData, activityData] = await Promise.all([fitnessApi.getToday(), fitnessApi.getActivityToday()]); setToday(todayData); setActivity(activityData); } catch (reason) { setError(message(reason)); }
  };
  useEffect(() => { void refresh(); }, []);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true); setError(null);
    try { await action(); await refresh(); } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  if (!today && !error) return <div className="api-status" role="status">Loading your Today plan...</div>;
  if (error && !today) return <div className="api-status error" role="alert">{error}<button onClick={() => void refresh()}>Retry</button></div>;
  if (today?.status !== 'READY' || !today.schedule || !today.nutrition?.targets) return <section className="greeting"><div><span className="eyebrow">Today</span><h1>Finish your setup<br /><em>to see your plan.</em></h1><p className="subtle">{today?.message ?? today?.nutrition?.metadata.message}</p></div><button className="primary dark-button" onClick={onEdit}>Continue onboarding</button></section>;
  const { schedule, nutrition, adherence } = today;
  const targets = nutrition.targets!;
  const nextMeal = schedule.meals.find((meal) => !meal.eatenAt) ?? schedule.meals[0];
  const workout = schedule.workout;
  return <>
    {error && <div className="api-status error" role="alert">{error}<button onClick={() => setError(null)}>x</button></div>}
    <div className="topbar"><span className="eyebrow">{formatDate(today.date!)}</span><span className="date">{schedule.isTrainingDay ? 'Training day' : 'Rest day'}</span></div>
    <section className="greeting"><div><span className="eyebrow">Today</span><h1>Hello, {today.profile?.name ?? profile.name}.<br /><em>{schedule.isTrainingDay ? 'Your plan is ready.' : 'Recovery counts too.'}</em></h1></div><div className="streak"><strong>{adherence?.consistencyPercent ?? 0}%</strong><span>today's consistency</span></div></section>
    <section className="grid"><article className="card workout-card">{workout ? <><div className="card-title"><span className="micro">Today's workout</span><span className="micro">{workout.estimatedMinutes} min</span></div><div className="workout-name">{workout.title}</div><div className="subtle">{workout.exercises.length} exercises · {workout.completedSets} / {workout.targetSets} sets complete</div><div className="workout-footer"><span className="subtle">Focus: {workout.targetMuscleGroups.join(' · ')}</span><button className="primary" onClick={onWorkout}>Start workout</button></div></> : <><div className="card-title"><span className="micro">Today's training</span></div><div className="workout-name">Rest<br />day</div><div className="subtle">No workout is scheduled. Your regular meals and recovery still matter.</div></>}</article>
      <article className="card nutrition"><div className="card-title"><h2>Daily nutrition</h2><span className="micro">Estimate</span></div><div className="macro-total">{targets.calories} <span>kcal target</span></div>{[['Protein', `${targets.proteinGrams} g`], ['Carbs', `${targets.carbohydrateGrams} g`], ['Fats', `${targets.fatGrams} g`], ['Fiber', `${targets.fiberGrams} g`]].map(([label, value]) => <div className="macro-row" key={label}><span>{label}</span><b>{value}</b></div>)}<p className="subtle">{nutrition.metadata.message}</p></article></section>
    <section className="lower-grid"><article className="card schedule"><div className="card-title"><h2>Today's meals</h2><span className="micro">{adherence?.mealsCompleted} / {adherence?.mealsPlanned} eaten</span></div><div className="schedule-list">{schedule.meals.map((meal) => <div className="schedule-item" key={meal.id}><span>{formatTime(meal.scheduledMinutes)}</span><div><b>{meal.slot.replaceAll('_', ' ')}</b><small>{meal.recipe.name} · {meal.recipe.calories} kcal</small>{meal.alternatives.map((alternative) => <small key={alternative.id}>Alternative: {alternative.name} · {alternative.calories} kcal <button className="auth-link" disabled={busy} onClick={() => void run(() => fitnessApi.replaceScheduledMeal(schedule.id, meal.slot, alternative.id))}>Replace</button></small>)}</div><div className="today-actions">{!meal.eatenAt && <button className="outline" disabled={busy} onClick={() => void run(() => fitnessApi.markScheduledMealEaten(schedule.id, meal.slot))}>I ate this</button>}{meal.eatenAt && <b>Done</b>}</div></div>)}</div>{nextMeal && <p className="subtle">Next: {nextMeal.recipe.name}. Nutrition is an estimate and varies by portion and preparation.</p>}</article>
      <article className="card"><div className="card-title"><h2>{workout ? 'Workout progress' : 'Recovery'}</h2><span className="micro">Today</span></div>{workout ? <div className="workout-list">{workout.exercises.map((item) => { const completed = workout.completedExerciseSets.find((exercise) => exercise.exerciseIndex === item.exerciseOrder)?.setsCompleted ?? 0; return <div className="exercise" key={item.exerciseOrder}><div><strong>{item.exercise.name}</strong><span>{item.sets} sets · {item.reps} reps · {item.restSeconds}s rest</span><span>{item.exercise.instructions[0]}</span></div><button className="check" disabled={busy || completed >= item.sets} onClick={() => void run(() => fitnessApi.updateWorkoutProgress(workout.id, [{ exerciseIndex: item.exerciseOrder, setsCompleted: completed + 1 }]))}>{completed}/{item.sets}</button></div>; })}</div> : <p className="subtle">Use today for recovery, movement, and your regular meals.</p>}</article>
      <article className="card"><div className="card-title"><h2>Activity</h2><span className="micro">{activity?.primary?.source ?? 'No source'}</span></div>{activity?.primary ? <><div className="macro-total">{activity.primary.steps ?? '--'} <span>/ {activity.stepGoal} steps</span></div><div className="progress-bar"><i style={{ width: `${activity.progress ?? 0}%` }} /></div>{[['Distance', activity.primary.distanceMeters ? `${(activity.primary.distanceMeters / 1000).toFixed(1)} km` : '--'], ['Active calories', activity.primary.activeCalories ? `${activity.primary.activeCalories} kcal estimate` : '--'], ['Sleep', activity.primary.sleepMinutes ? `${Math.round(activity.primary.sleepMinutes / 60 * 10) / 10} hr` : '--']].map(([label, value]) => <div className="macro-row" key={label}><span>{label}</span><b>{value}</b></div>)}<p className="subtle">{activity.note}</p></> : <p className="subtle">No activity data has been synced. A future mobile app can periodically sync Health Connect, HealthKit, wearable, or manual summaries.</p>}</article></section>
  </>;
}

function formatDate(value: string): string { return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value)); }
function formatTime(minutes: number): string { const normalized = minutes % 1440; const hour = Math.floor(normalized / 60); const minute = normalized % 60; return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`; }
function message(reason: unknown): string { return reason instanceof ApiError ? reason.message : 'Unable to load your Today plan. Please try again.'; }
