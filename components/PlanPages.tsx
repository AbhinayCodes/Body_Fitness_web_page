import { useEffect, useState } from 'react';
import { ApiError, fitnessApi } from '@/lib/api';
import type { GeneratedWorkoutPlan, Profile, ProgressSummary, ReminderSettings, TodayExperience } from '@/types/fitness';

function useTodayPlan() {
	const [today, setToday] = useState<TodayExperience | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const load = async () => { setError(null); try { setToday(await fitnessApi.getToday()); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to load your plan.'); } };
	useEffect(() => { void load(); }, []);
	const run = async (action: () => Promise<unknown>) => { setBusy(true); setError(null); try { await action(); await load(); } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Unable to save your progress.'); } finally { setBusy(false); } };
	return { today, error, busy, load, run };
}

export function WorkoutPage() {
	const { today, error, busy, load, run } = useTodayPlan();
	if (!today) return <p className="subtle" role={error ? 'alert' : 'status'}>{error ?? 'Loading your workout...'}{error && <button onClick={() => void load()}>Retry</button>}</p>;
	const session = today.schedule?.workout;
	if (!session) return <p className="subtle">{today.message ?? (today.schedule ? 'Rest day. No workout is scheduled today.' : 'Complete your training setup to view your workout.')}</p>;
	return <><div className="card-title"><div><h2>{session.title}</h2><span className="micro">{session.targetMuscleGroups.join(' · ')}</span></div><span className="micro">{session.estimatedMinutes} min</span></div>{error && <div className="api-status error" role="alert">{error}</div>}<div className="workout-list">{session.exercises.map((item) => {
		const completed = session.completedExerciseSets.find((exercise) => exercise.exerciseIndex === item.exerciseOrder)?.setsCompleted ?? 0;
		return <div className="exercise" key={item.exerciseOrder}><div><strong>{item.exercise.name}</strong><span>{item.sets} sets · {item.reps} reps · {item.restSeconds} sec rest</span><span>{item.exercise.instructions[0]}</span></div><button className={`check ${completed >= item.sets ? 'done' : ''}`} disabled={busy || completed >= item.sets} aria-label={`Log a set of ${item.exercise.name}`} onClick={() => void run(() => fitnessApi.updateWorkoutProgress(session.id, [{ exerciseIndex: item.exerciseOrder, setsCompleted: completed + 1 }]))}>{completed}/{item.sets}</button></div>;
	})}</div><p className="subtle">{session.completed ? 'Workout complete.' : `${session.completedSets} / ${session.targetSets} sets complete`}</p></>;
}

export function DietPage() {
	const { today, error, busy, load, run } = useTodayPlan();
	if (!today) return <p className="subtle" role={error ? 'alert' : 'status'}>{error ?? 'Loading your meals...'}{error && <button onClick={() => void load()}>Retry</button>}</p>;
	const schedule = today.schedule;
	if (!schedule) return <p className="subtle">{today.message ?? 'Complete your setup to view your meals.'}</p>;
	return <><div className="card-title"><h2>Today's meals</h2><span className="micro">{today.nutrition?.targets?.calories ?? '--'} kcal target</span></div>{error && <div className="api-status error" role="alert">{error}</div>}<div className="schedule-list">{schedule.meals.map((meal) => <div className="schedule-item" key={meal.id}><span>{String(Math.floor(meal.scheduledMinutes % 1440 / 60)).padStart(2, '0')}:{String(meal.scheduledMinutes % 60).padStart(2, '0')}</span><div><b>{meal.recipe.name}</b><small>{meal.recipe.calories} kcal</small></div><button className="outline" disabled={busy || Boolean(meal.eatenAt)} onClick={() => void run(() => fitnessApi.markScheduledMealEaten(schedule.id, meal.slot))}>{meal.eatenAt ? 'Eaten' : 'I ate this'}</button></div>)}</div></>;
}

export function CalendarPage() {
	const [plan, setPlan] = useState<GeneratedWorkoutPlan | null>(null);
	const [error, setError] = useState<string | null>(null);
	const load = () => { setError(null); return fitnessApi.getWorkoutPlan().then(setPlan).catch((reason) => setError(reason instanceof ApiError ? reason.message : 'Unable to load your calendar.')); };
	useEffect(() => { void load(); }, []);
	if (!plan) return <p className="subtle" role={error ? 'alert' : 'status'}>{error ?? 'Loading your calendar...'}{error && <button onClick={() => void load()}>Retry</button>}</p>;
	const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
	return <><div className="card-title"><h2>Weekly training schedule</h2><span className="micro">{plan.days.length} workouts planned</span></div><div className="schedule-list">{weekdays.map((day) => { const workout = plan.days.find((session) => session.weekday === day); return <div className={`schedule-item ${day === weekday ? 'current' : ''}`} key={day}><span>{day}</span><b>{workout?.title ?? 'Rest day'}</b><span>{day === weekday ? 'Today' : workout ? `${workout.estimatedMinutes} min` : ''}</span></div>; })}</div></>;
}
export function ProgressPage() {
	const [summary, setSummary] = useState<ProgressSummary | null>(null);
	const [weightKg, setWeightKg] = useState('');
	const [waistCm, setWaistCm] = useState('');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const load = () => { setError(null); return fitnessApi.getProgress().then(setSummary).catch(() => setError('Unable to load progress.')); };
	useEffect(() => { load(); }, []);
	const setFrequency = async (checkInFrequencyDays: 7 | 14) => { setError(null); try { await fitnessApi.saveProgressSettings(checkInFrequencyDays); await load(); } catch { setError('Unable to save check-in frequency.'); } };
	const save = async () => { if (!weightKg || Number(weightKg) < 25 || Number(weightKg) > 350) return setError('Enter a valid weight.'); setSaving(true); setError(null); try { await fitnessApi.saveCheckIn({ recordedAt: new Date().toISOString().slice(0, 10), weightKg: Number(weightKg), measurements: waistCm ? [{ type: 'WAIST', valueCm: Number(waistCm) }] : undefined }); setWeightKg(''); setWaistCm(''); await load(); } catch { setError('Unable to save your check-in.'); } finally { setSaving(false); } };
	if (!summary) return <p className="subtle" role={error ? 'alert' : 'status'}>{error ?? 'Loading your progress...'}{error && <button onClick={() => void load()}>Retry</button>}</p>;
	return <><div className="card-title"><h2>Progress check-in</h2><span className="micro">{summary.checkIn.due ? 'Due now' : `Next: ${new Date(summary.checkIn.dueDate).toLocaleDateString('en-IN')}`}</span></div>{error && <div className="api-status error">{error}</div>}<div className="form-grid"><NumberField label="Weight (kg)" value={weightKg ? Number(weightKg) : undefined} onChange={(value) => setWeightKg(value?.toString() ?? '')} /><NumberField label="Waist (cm, optional)" value={waistCm ? Number(waistCm) : undefined} onChange={(value) => setWaistCm(value?.toString() ?? '')} /></div><div className="choices" style={{ marginTop: 16 }}><button className={`choice ${summary.checkIn.frequencyDays === 7 ? 'selected' : ''}`} onClick={() => void setFrequency(7)}>Weekly</button><button className={`choice ${summary.checkIn.frequencyDays === 14 ? 'selected' : ''}`} onClick={() => void setFrequency(14)}>Every 2 weeks</button></div><button className="primary dark-button" disabled={saving} style={{ marginTop: 18 }} onClick={() => void save()}>{saving ? 'Saving...' : 'Save check-in'}</button><div className="schedule-list" style={{ marginTop: 24 }}>{summary.weightTrend.map((entry) => <div className="schedule-item" key={entry.date}><span>{new Date(entry.date).toLocaleDateString('en-IN')}</span><b>{entry.weightKg} kg</b></div>)}</div><p className="subtle">{summary.checkIn.weightChangeKg === null ? 'Your first check-in establishes a baseline.' : `${summary.checkIn.weightChangeKg > 0 ? '+' : ''}${summary.checkIn.weightChangeKg} kg since the previous check-in.`} {summary.checkIn.note}</p><div className="macro-row"><span>Workout consistency</span><b>{summary.consistency.completedWorkouts} / {summary.consistency.plannedWorkouts} ({summary.consistency.workoutCompletionPercent}%)</b></div><div className="macro-row"><span>Meal adherence</span><b>{summary.consistency.mealsCompleted} / {summary.consistency.mealsPlanned} ({summary.consistency.mealAdherencePercent}%)</b></div>{summary.performance.length > 0 && <div className="schedule-list" style={{ marginTop: 18 }}>{summary.performance.slice(0, 5).map((item, index) => <div className="schedule-item" key={`${item.exercise}-${index}`}><span>{item.exercise}</span><b>{item.sets} x {item.reps}{item.weightKg !== null ? ` · ${item.weightKg} kg` : ''}</b></div>)}</div>}</>;
}
export function ProfilePage({ profile, onEdit }: { profile: Profile; onEdit: () => void }) { return <><div className="card-title"><h2>{profile.name}</h2><span className="micro">Profile</span></div><div className="schedule-list">{[['Primary goal', profile.goal], ['Training rhythm', profile.days], ['Food preference', profile.diet]].map(([label, value]) => <div className="schedule-item" key={label}><span>{label}</span><b>{value}</b></div>)}</div><button className="primary dark-button" style={{ marginTop: 24 }} onClick={onEdit}>Update preferences</button><ReminderControls /></>; }

function ReminderControls() {
	const [settings, setSettings] = useState<ReminderSettings | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => { fitnessApi.getReminderSettings().then(setSettings).catch(() => setError('Unable to load reminder settings.')); }, []);
	const save = async (changes: Partial<ReminderSettings>) => { setError(null); try { const next = await fitnessApi.saveReminderSettings(changes); setSettings(next); } catch { setError('Unable to save reminder settings.'); } };
	if (!settings) return <p className="subtle" style={{ marginTop: 24 }}>{error ?? 'Loading reminders...'}</p>;
	const toggles: Array<[keyof Pick<ReminderSettings, 'workoutEnabled' | 'mealEnabled' | 'preWorkoutEnabled' | 'postWorkoutEnabled' | 'checkInEnabled'>, string]> = [['workoutEnabled', 'Workout'], ['mealEnabled', 'Meals'], ['preWorkoutEnabled', 'Pre-workout'], ['postWorkoutEnabled', 'Post-workout'], ['checkInEnabled', 'Progress check-in']];
	return <section style={{ marginTop: 28 }}><div className="card-title"><h2>Reminders</h2><span className="micro">No push delivery yet</span></div>{error && <div className="api-status error">{error}</div>}<div className="schedule-list">{toggles.map(([key, label]) => <label className="schedule-item" key={key}><span>{label}</span><input type="checkbox" checked={settings[key]} onChange={(event) => void save({ [key]: event.target.checked })} /></label>)}</div><div className="form-grid" style={{ marginTop: 16 }}><div className="field"><label>Timezone</label><input value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} onBlur={() => void save({ timezone: settings.timezone })} /></div><div className="field"><label>Workout reminder lead (minutes)</label><input type="number" min="5" max="120" value={settings.workoutLeadMinutes} onChange={(event) => setSettings({ ...settings, workoutLeadMinutes: Number(event.target.value) })} onBlur={() => void save({ workoutLeadMinutes: settings.workoutLeadMinutes })} /></div><div className="field"><label>Meal reminder lead (minutes)</label><input type="number" min="0" max="60" value={settings.mealLeadMinutes} onChange={(event) => setSettings({ ...settings, mealLeadMinutes: Number(event.target.value) })} onBlur={() => void save({ mealLeadMinutes: settings.mealLeadMinutes })} /></div><div className="field"><label>Check-in reminder time</label><input type="time" value={settings.checkInTime} onChange={(event) => setSettings({ ...settings, checkInTime: event.target.value })} onBlur={() => void save({ checkInTime: settings.checkInTime })} /></div></div><p className="subtle">Reminder times follow your saved schedule and timezone. This web app stores preferences and does not send push notifications.</p></section>;
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) { return <div className="field"><label>{label}</label><input type="number" value={value ?? ''} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)} /></div>; }
