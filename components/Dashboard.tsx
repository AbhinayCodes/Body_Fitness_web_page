'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, Dumbbell, Flame, Footprints, Leaf, Plus, Settings2, Sunrise, Utensils, ArrowLeftRight, X } from 'lucide-react';
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
  const consistency = Math.min(100, Math.max(0, adherence?.consistencyPercent ?? 0));
  return <>
    {error && <div className="api-status error" role="alert">{error}<button aria-label="Dismiss message" onClick={() => setError(null)}><X size={16} /></button></div>}
    <div className="topbar"><span className="eyebrow">Your daily overview</span><div className="topbar-tools"><span className="date"><CalendarDays size={15} aria-hidden="true" />{formatDate(today.date!)}</span><button className="icon-button" title="Edit your plan" aria-label="Edit your plan" onClick={onEdit}><Settings2 size={17} /></button></div></div>
    <section className="greeting"><div><span className="day-badge">{schedule.isTrainingDay ? <Dumbbell size={13} /> : <Leaf size={13} />}{schedule.isTrainingDay ? 'Training day' : 'Recovery day'}</span><h1>Hello, {today.profile?.name ?? profile.name}.</h1><p>{schedule.isTrainingDay ? 'A little stronger, one session at a time.' : 'Take a breath. Recovery is part of your progress.'}</p></div><div className="consistency"><div className="consistency-ring" style={{ '--progress': `${consistency}%` } as CSSProperties}><strong>{consistency}%</strong></div><div><b>Daily consistency</b><span>Meals + movement</span></div></div></section>
    <section className="metrics-strip" aria-label="Today's summary">
      <div className="metric"><span className="metric-icon"><Dumbbell size={19} /></span><div><div className="metric-label">Workout sets</div><div className="metric-value">{workout?.completedSets ?? 0} <small>/ {workout?.targetSets ?? 0}</small></div></div></div>
      <div className="metric"><span className="metric-icon"><Flame size={19} /></span><div><div className="metric-label">Calorie target</div><div className="metric-value">{targets.calories.toLocaleString('en-IN')} <small>kcal</small></div></div></div>
      <div className="metric"><span className="metric-icon"><Utensils size={19} /></span><div><div className="metric-label">Meals completed</div><div className="metric-value">{adherence?.mealsCompleted ?? 0} <small>/ {adherence?.mealsPlanned ?? 0}</small></div></div></div>
      <div className="metric"><span className="metric-icon"><Footprints size={19} /></span><div><div className="metric-label">Today's steps</div><div className="metric-value">{activity?.primary?.steps?.toLocaleString('en-IN') ?? '--'} <small>steps</small></div></div></div>
    </section>
    <section className="grid dashboard-overview">
      <article className="card workout-card"><img className="workout-image" src="/images/training.jpg" alt="" width={1600} height={1067} fetchPriority="high" /><div className="card-title"><span className="micro">Your training session</span><span className="day-badge">{workout ? <Clock3 size={13} /> : <Leaf size={13} />}{workout ? `${workout.estimatedMinutes} min` : 'Recovery'}</span></div>
        <div><h2 className="workout-name">{workout?.title ?? 'Time to recharge.'}</h2><div className="subtle">{workout ? `${workout.exercises.length} exercises / ${workout.targetSets} planned sets` : 'No workout scheduled for today.'}</div></div>
        <div className="workout-footer"><span className="subtle">{workout ? workout.targetMuscleGroups.join(' / ') : 'Movement, regular meals, and a good night of sleep.'}</span>{workout && <button className="primary" onClick={onWorkout}>{workout.completed ? 'View workout' : workout.completedSets ? 'Continue' : 'Start workout'}<ArrowRight size={16} /></button>}</div>
      </article>
      <article className="card nutrition nutrition-overview"><div className="card-title"><h2>Daily nutrition</h2><span className="micro">Target</span></div><div className="macro-total">{targets.calories.toLocaleString('en-IN')} <span>kcal / day</span></div><div className="macro-chart" aria-hidden="true"><i style={{ flex: targets.proteinGrams * 4 }} /><i style={{ flex: targets.carbohydrateGrams * 4 }} /><i style={{ flex: targets.fatGrams * 9 }} /></div><div className="macro-legend">{[['Protein', targets.proteinGrams], ['Carbs', targets.carbohydrateGrams], ['Fats', targets.fatGrams]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value} g</b></div>)}</div><div className="macro-row"><span>Daily fiber</span><b>{targets.fiberGrams} g</b></div><p className="nutrition-note">{nutrition.metadata.message}</p></article>
    </section>
    <section className="lower-grid">
      <article className="dashboard-section"><div className="card-title"><h2>On the menu</h2><span className="micro">{adherence?.mealsCompleted ?? 0} / {adherence?.mealsPlanned ?? 0} eaten</span></div><div className="schedule-list">{schedule.meals.map((meal) => <div className="schedule-item meal-row" key={meal.id}><div className="meal-time"><Sunrise size={18} aria-hidden="true" /><span>{formatTime(meal.scheduledMinutes)}</span></div><div><span className="micro">{meal.slot.replaceAll('_', ' ')}</span><h3>{meal.recipe.name}</h3><small>{meal.recipe.calories} kcal / serving</small>{meal.alternatives.length > 0 && <details className="meal-alternatives"><summary>{meal.alternatives.length} alternatives</summary>{meal.alternatives.map((alternative) => <small key={alternative.id}><span>{alternative.name} / {alternative.calories} kcal</span><button className="icon-button" title={`Replace with ${alternative.name}`} aria-label={`Replace with ${alternative.name}`} disabled={busy} onClick={() => void run(() => fitnessApi.replaceScheduledMeal(schedule.id, meal.slot, alternative.id))}><ArrowLeftRight size={14} /></button></small>)}</details>}</div><button className={`icon-button meal-check ${meal.eatenAt ? 'done' : ''}`} title={meal.eatenAt ? 'Meal completed' : 'Mark meal eaten'} aria-label={meal.eatenAt ? `${meal.recipe.name} completed` : `Mark ${meal.recipe.name} eaten`} disabled={busy || Boolean(meal.eatenAt)} onClick={() => void run(() => fitnessApi.markScheduledMealEaten(schedule.id, meal.slot))}>{meal.eatenAt ? <Check size={17} /> : <Plus size={17} />}</button></div>)}</div>{nextMeal && <p className="nutrition-note">{schedule.meals.every((meal) => meal.eatenAt) ? 'All planned meals completed.' : `Up next: ${nextMeal.recipe.name}.`} Nutrition varies by portion and preparation.</p>}</article>
      <div className="section-stack"><article className="dashboard-section"><div className="card-title"><h2>{workout ? 'Your movement' : 'Recovery'}</h2><span className="micro">{workout ? `${workout.completedSets} / ${workout.targetSets} sets` : 'Today'}</span></div>{workout ? <div className="workout-list">{workout.exercises.map((item) => { const completed = workout.completedExerciseSets.find((exercise) => exercise.exerciseIndex === item.exerciseOrder)?.setsCompleted ?? 0; return <div className="exercise" key={item.exerciseOrder}><div><strong>{item.exercise.name}</strong><span>{item.sets} sets / {item.reps} reps / {item.restSeconds}s rest</span><span>{item.exercise.instructions[0]}</span></div><button className={`check ${completed >= item.sets ? 'done' : ''}`} title={`Log a set of ${item.exercise.name}`} aria-label={`Log a set of ${item.exercise.name}, ${completed} of ${item.sets} complete`} disabled={busy || completed >= item.sets} onClick={() => void run(() => fitnessApi.updateWorkoutProgress(workout.id, [{ exerciseIndex: item.exerciseOrder, setsCompleted: completed + 1 }]))}>{completed >= item.sets ? <Check size={17} /> : `${completed}/${item.sets}`}</button></div>; })}</div> : <p className="subtle">Use today for recovery, movement, and your regular meals.</p>}</article>
        <article className="dashboard-section activity-section"><div className="card-title"><h2><Footprints size={19} aria-hidden="true" />Daily activity</h2><span className="micro">{activity?.primary?.source.replaceAll('_', ' ') ?? 'Not synced'}</span></div>{activity?.primary ? <><div className="macro-total">{activity.primary.steps?.toLocaleString('en-IN') ?? '--'} <span>/ {activity.stepGoal.toLocaleString('en-IN')} steps</span></div><div className="progress-bar"><i style={{ width: `${activity.progress ?? 0}%` }} /></div>{[['Distance', activity.primary.distanceMeters != null ? `${(activity.primary.distanceMeters / 1000).toFixed(1)} km` : '--'], ['Active calories', activity.primary.activeCalories != null ? `${activity.primary.activeCalories} kcal` : '--'], ['Sleep', activity.primary.sleepMinutes != null ? `${Math.round(activity.primary.sleepMinutes / 60 * 10) / 10} hr` : '--']].map(([label, value]) => <div className="macro-row" key={label}><span>{label}</span><b>{value}</b></div>)}<p className="nutrition-note">{activity.note}</p></> : <p className="subtle">No activity data synced yet.</p>}</article>
      </div>
    </section>
  </>;
}

function formatDate(value: string): string { return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(value)); }
function formatTime(minutes: number): string { const normalized = minutes % 1440; const hour = Math.floor(normalized / 60); const minute = normalized % 60; return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`; }
function message(reason: unknown): string { return reason instanceof ApiError ? reason.message : 'Unable to load your Today plan. Please try again.'; }
