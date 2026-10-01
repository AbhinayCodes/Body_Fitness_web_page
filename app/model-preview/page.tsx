'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ExerciseDemo } from '@/components/AnatomicalExerciseDemo';
import { exerciseGuides } from '@/lib/exercise-guides';

export default function ModelPreviewPage() {
  const [slug, setSlug] = useState('push-up');
  const [model, setModel] = useState<'cc0' | 'athletic'>('cc0');
  const guide = exerciseGuides.find((exercise) => exercise.slug === slug)!;

  return <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 48px' }}>
    <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}><ArrowLeft size={18} />Workouts</a>
    <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <div><span className="micro">Model study</span><h1 style={{ fontSize: 28, margin: '4px 0 0' }}>Athletic Model</h1></div>
      <label style={{ display: 'grid', gap: 6, maxWidth: '100%' }}>Model<select value={model} onChange={(event) => setModel(event.target.value === 'cc0' ? 'cc0' : 'athletic')} style={{ maxWidth: '100%', padding: '10px 12px' }}><option value="cc0">CC0 human base</option><option value="athletic">Procedural prototype</option></select></label>
      <label style={{ display: 'grid', gap: 6, maxWidth: '100%' }}>Exercise<select value={slug} onChange={(event) => setSlug(event.target.value)} style={{ maxWidth: '100%', padding: '10px 12px' }}>{exerciseGuides.map((exercise) => <option key={exercise.slug} value={exercise.slug}>{exercise.name}</option>)}</select></label>
    </header>
    <ExerciseDemo key={`${model}-${slug}`} guide={guide} instructions={[]} modelSource={model} initialMode="muscles" />
  </main>;
}