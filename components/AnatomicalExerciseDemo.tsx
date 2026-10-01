'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import type { ExerciseGuide, Muscle } from '@/lib/exercise-guides';
import type { createAnatomyViewer } from '@/lib/anatomy-viewer';

const muscleNames: Record<Muscle, string> = { quads: 'Quadriceps', glutes: 'Glutes', hamstrings: 'Hamstrings', chest: 'Chest', triceps: 'Triceps', back: 'Back', biceps: 'Biceps', shoulders: 'Shoulders', core: 'Core', calves: 'Calves' };

export function ExerciseDemo({ guide, instructions }: { guide: ExerciseGuide; instructions: string[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewer = useRef<Awaited<ReturnType<typeof createAnatomyViewer>>>(null);
  const clock = useRef(0);
  const slider = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('1');
  const [mode, setMode] = useState<'movement' | 'muscles'>('movement');
  const [angle, setAngle] = useState(35);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
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
      instance = await createAnatomyViewer(canvas.current, guide, controller.signal);
      if (controller.signal.aborted) { instance?.dispose(); return; }
      viewer.current = instance; setStatus('ready');
    }).catch(() => { if (!controller.signal.aborted) setStatus('error'); });
    return () => { controller.abort(); instance?.dispose(); viewer.current = null; };
  }, [guide, attempt]);

  useEffect(() => {
    let frame = 0;
    let previous = 0;
    const render = (time: number) => {
      if (previous && playing && mode === 'movement' && !document.hidden) clock.current = (clock.current + Math.min(time - previous, 64) * Number(speed) / 6000) % 1;
      previous = time;
      viewer.current?.update(clock.current, mode, angle);
      if (slider.current) slider.current.value = String(Math.round(clock.current * 100));
      if (playing && mode === 'movement' && !guide.hold && status === 'ready') frame = requestAnimationFrame(render);
    };
    render(0);
    const resize = new ResizeObserver(() => viewer.current?.update(clock.current, mode, angle));
    if (canvas.current) resize.observe(canvas.current);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); };
  }, [guide, playing, speed, mode, angle, status]);

  const seek = (value: number) => {
    clock.current = value; setPlaying(false);
    viewer.current?.update(value, mode, angle);
    if (slider.current) slider.current.value = String(value * 100);
  };

  return <section className="exercise-demo" aria-labelledby={headingId}>
    <div className="demo-heading"><div><span className="micro">Exercise guide</span><h3 id={headingId}>{guide.name}</h3></div><div className="demo-modes" aria-label="Exercise view">{(['movement', 'muscles'] as const).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'movement' ? 'Movement' : 'Muscles'}</button>)}</div></div>
    <div className="demo-stage demo-anatomy"><div className="demo-stage-label"><span>{mode === 'muscles' ? 'Muscle anatomy' : 'Anatomical demonstration'}</span><span className="demo-red-key">Working muscles</span></div><div className="demo-canvas-wrap"><canvas ref={canvas} width={800} height={600} role="img" aria-label={`${guide.name}: anatomical human model. Working muscles: ${guide.muscles.map((muscle) => muscleNames[muscle]).join(', ')}.`} />{status !== 'ready' && <div className="demo-loading" role={status === 'error' ? 'alert' : 'status'}>{status === 'loading' ? 'Loading anatomy...' : <><p>The anatomical model could not load.</p><button className="outline" onClick={() => setAttempt(attempt + 1)}>Retry</button></>}</div>}</div><div className="demo-angle-controls"><div className="demo-modes" aria-label="Camera view">{[{ name: 'Front', angle: 0 }, { name: 'Side', angle: 90 }, { name: 'Back', angle: 180 }].map((view) => <button key={view.name} aria-pressed={angle === view.angle} onClick={() => setAngle(view.angle)}>{view.name}</button>)}</div><button type="button" className="icon-button" title="Rotate view" aria-label="Rotate view" onClick={() => setAngle((angle + 45) % 360)}><RotateCw size={17} /></button></div></div>
    {mode === 'movement' && !guide.hold && <div className="demo-controls"><button className="icon-button" type="button" disabled={status !== 'ready'} title={playing ? 'Pause animation' : 'Play animation'} aria-label={playing ? 'Pause animation' : 'Play animation'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><button className="icon-button" type="button" disabled={status !== 'ready'} title="Reset animation" aria-label="Reset animation" onClick={() => seek(0)}><RotateCcw size={17} /></button><input ref={slider} type="range" min="0" max="100" defaultValue="0" disabled={status !== 'ready'} aria-label="Animation position" onChange={(event) => seek(Number(event.target.value) / 100)} /><select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(event.target.value)}><option value="0.5">0.5x</option><option value="1">1x</option></select></div>}
    <ul className="demo-muscles" aria-label="Working muscles">{guide.muscles.map((muscle) => <li key={muscle}>{muscleNames[muscle]}</li>)}</ul>
    {guide.slug === 'brisk-walk-interval' && <p className="subtle">Whole-body cardiovascular exercise; the highlighted muscles help power your stride.</p>}
    <ol className="demo-steps">{instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}</ol>
    <p className="demo-cue">{guide.cue}</p><p className="demo-safety">Illustrative motion, not a form assessment. Use a comfortable range and stop if you feel pain. Ask a qualified trainer to check unfamiliar movements.</p>
    <p className="demo-attribution"><a href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">Z-Anatomy / BodyParts3D</a> · Adapted model · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · <a href="/models/README.md" target="_blank" rel="noreferrer">Credits</a></p>
  </section>;
}