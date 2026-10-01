'use client';

import { RotateCcw } from 'lucide-react';

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f4f6f5', color: '#202923', fontFamily: 'sans-serif' }}>
        <main style={{ maxWidth: 480, margin: '15vh auto', padding: 24 }}>
          <h1 style={{ fontSize: 28 }}>Something went wrong</h1>
          <p>Formwell could not load this page.</p>
          <button onClick={retry} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 18px', border: 0, borderRadius: 4, background: '#245d44', color: '#fff', font: 'inherit', cursor: 'pointer' }}>
            <RotateCcw size={18} aria-hidden="true" /> Try again
          </button>
        </main>
      </body>
    </html>
  );
}