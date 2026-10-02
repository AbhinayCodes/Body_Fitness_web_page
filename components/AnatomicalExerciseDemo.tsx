'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import type { ExerciseGuide, Muscle } from '@/lib/exercise-guides';
import type { createAnatomyViewer, ModelSource } from '@/lib/anatomy-viewer';

const muscleNames: Record<Muscle, string> = { quads: 'Quadriceps', glutes: 'Glutes', hamstrings: 'Hamstrings', chest: 'Chest', triceps: 'Triceps', back: 'Back', biceps: 'Biceps', shoulders: 'Shoulders', core: 'Core', calves: 'Calves' };

export function WorkoutExerciseDemo({ guide, instructions }: { guide: ExerciseGuide; instructions: string[] }) {
  return <ExerciseDemo guide={guide} instructions={instructions} modelSource="cc0" initialHighlights />;
}

export function ExerciseDemo({ guide, instructions, modelSource = 'cc0', initialMode = 'movement', initialHighlights = modelSource !== 'cc0' }: { guide: ExerciseGuide; instructions: string[]; modelSource?: ModelSource; initialMode?: 'movement' | 'muscles'; initialHighlights?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<Awaited<ReturnType<typeof createAnatomyViewer>>>(null);
  const clock = useRef(0);
  const slider = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('1');
  const [mode, setMode] = useState<'movement' | 'muscles'>(modelSource === 'athletic' ? 'muscles' : initialMode);
  const [angle, setAngle] = useState(35);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [highlightMuscles, setHighlightMuscles] = useState(initialHighlights);
  const headingId = useId();

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!preference.matches && !guide.hold);
    const change = () => { if (preference.matches) setPlaying(false); };
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, [guide]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    let instance: Awaited<ReturnType<typeof createAnatomyViewer>> = null;
    import('@/lib/anatomy-viewer').then(async ({ createAnatomyViewer }) => {
      if (controller.signal.aborted || !canvas.current) return;
      instance = await createAnatomyViewer(canvas.current, guide, controller.signal, modelSource);
      if (controller.signal.aborted) { instance?.dispose(); return; }
      viewer.current = instance; setStatus('ready');
    }).catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => { controller.abort(); instance?.dispose(); viewer.current = null; };
  }, [guide, attempt, modelSource]);

  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const render = (time: number) => {
      if (previous && playing && mode === 'movement' && !document.hidden) clock.current = (clock.current + Math.min(time - previous, 64) * Number(speed) / 6000) % 1;
      previous = time;
      viewer.current?.update(clock.current, mode, angle, highlightMuscles);
      if (slider.current) slider.current.value = String(Math.round(clock.current * 100));
      if (playing && mode === 'movement' && !guide.hold && status === 'ready') frame = requestAnimationFrame(render);
    };
    render(0);
    const resize = new ResizeObserver(() => viewer.current?.update(clock.current, mode, angle, highlightMuscles));
    if (canvas.current) resize.observe(canvas.current);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  }, [guide, playing, speed, mode, angle, status, highlightMuscles]);

  const seek = (value: number) => {
    clock.current = value; setPlaying(false);
    viewer.current?.update(value, mode, angle, highlightMuscles);
    if (slider.current) slider.current.value = String(value * 100);
  };

  return <section className="exercise-demo" aria-labelledby={headingId}>
    <div className="demo-heading"><div><span className="micro">{modelSource === 'athletic' ? 'Muscle study' : 'Exercise guide'}</span><h3 id={headingId}>{guide.name}</h3></div>{modelSource !== 'athletic' && <div className="demo-modes" aria-label="Exercise view">{(['movement', 'muscles'] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'movement' ? 'Movement' : 'Muscles'}</button>)}</div>}</div>
    {modelSource !== 'anatomy' && <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 32, marginBottom: 8, fontSize: 13 }}><input type="checkbox" checked={highlightMuscles} onChange={(event) => setHighlightMuscles(event.target.checked)} style={{ width: 16, height: 16, margin: 0 }} />Muscle highlights</label>}
    <div className="demo-stage demo-anatomy"><div className="demo-stage-label"><span>{mode === 'muscles' ? 'Muscle view' : 'Human body animation'}</span>{highlightMuscles && <span className="demo-red-key">Working muscles</span>}</div><div className="demo-canvas-wrap"><canvas ref={canvas} width={800} height={600} role="img" aria-label={`${guide.name}: human body model. ${highlightMuscles ? `Working muscles: ${guide.muscles.map((muscle) => muscleNames[muscle]).join(', ')}.` : 'Neutral body view.'}`} />{status !== 'ready' && <div className="demo-loading" role={status === 'error' ? 'alert' : 'status'}>{status === 'loading' ? 'Loading human body...' : <><p>The human body model could not load.</p><button className="outline" onClick={() => setAttempt(attempt + 1)}>Retry</button></>}</div>}</div><div className="demo-angle-controls"><div className="demo-modes" aria-label="Camera view">{[{ name: 'Front', angle: 0 }, { name: 'Side', angle: 90 }, { name: 'Back', angle: 180 }].map((view) => <button key={view.name} aria-pressed={angle === view.angle} onClick={() => setAngle(view.angle)}>{view.name}</button>)}</div><button type="button" className="icon-button" title="Rotate view" aria-label="Rotate view" onClick={() => setAngle((angle + 45) % 360)}><RotateCw size={17} /></button></div></div>
    {mode === 'movement' && !guide.hold && <div className="demo-controls"><button className="icon-button" type="button" disabled={status !== 'ready'} title={playing ? 'Pause animation' : 'Play animation'} aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><button className="icon-button" type="button" disabled={status !== 'ready'} title="Reset animation" aria-label="Reset animation" onClick={() => seek(0)}><RotateCcw size={17} /></button><input ref={slider} type="range" min="0" max="100" defaultValue="0" disabled={status !== 'ready'} aria-label="Animation position" onChange={(event) => seek(Number(event.target.value) / 100)} /><select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(event.target.value)}><option value="0.5">0.5x</option><option value="1">1x</option></select></div>}
    <ul className="demo-muscles" aria-label="Working muscles">{guide.muscles.map((muscle) => <li key={muscle}>{muscleNames[muscle]}</li>)}</ul>
    {guide.slug === 'brisk-walk-interval' && <p className="subtle">Whole-body cardiovascular exercise; the highlighted muscles help power your stride.</p>}
    <ol className="demo-steps">{instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}</ol>
    <p className="demo-cue">{guide.cue}</p><p className="demo-safety">{mode === 'movement' ? 'Illustrative motion' : 'Illustrative muscle regions'}, not a form assessment. Use a comfortable range and stop if you feel pain. Ask a qualified trainer to check unfamiliar movements.</p>
    {modelSource === 'anatomy' ? <p className="demo-attribution"><a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">Z-Anatomy / BodyParts3D</a> · Adapted model · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · <a href="/models/README.md" target="_blank" rel="noreferrer">Credits</a></p> : <p className="demo-attribution">{modelSource === 'cc0' ? 'MakeHuman Community · CC0 · Approximate surface highlights' : 'Original procedural character · Prototype'} · <a href="/models/README.md" target="_blank" rel="noreferrer">Model details</a></p>}
  </section>;
}