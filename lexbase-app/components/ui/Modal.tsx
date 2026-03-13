'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, maxWidth = 'max-w-lg', children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={`bg-surface border border-border rounded-xl shadow-2xl w-[95%] ${maxWidth} animate-in zoom-in-95 duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2 text-text-muted hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Form Input Components ─────────────────────────────────────
export function FormGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">
        {label} {required && <span className="text-red">*</span>}
      </label>
      {children}
    </div>
  );
}

export function FormInput({ type = 'text', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      {...props}
      className={`w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors ${props.className || ''}`}
    />
  );
}

export function FormSelect({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold transition-colors ${props.className || ''}`}
    >
      {children}
    </select>
  );
}

export function FormTextarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors resize-none ${props.className || ''}`}
    />
  );
}

// ── Button Components ────────────────────────────────────────
export function BtnGold({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-5 py-2.5 bg-gold text-bg font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function BtnOutline({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-5 py-2.5 border border-border text-text-muted font-medium rounded-lg text-sm hover:bg-surface2 hover:text-text transition-colors ${props.className || ''}`}
    >
      {children}
    </button>
  );
}
