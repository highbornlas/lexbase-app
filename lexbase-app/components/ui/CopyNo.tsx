'use client';
import { useState } from 'react';

export function CopyNo({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}
      className="inline-flex items-center ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity"
      title="Kopyala"
    >
      {ok ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="text-green"><path d="M4 8l3 3 5-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-dim hover:text-gold"><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M3 11V3a1 1 0 011-1h8"/></svg>
      )}
    </button>
  );
}
