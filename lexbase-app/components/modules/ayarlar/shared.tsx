'use client';

import { type ReactNode } from 'react';

/* ══════════════════════════════════════════════════════════════
   Ayarlar — Paylaşılan Bileşenler
   ══════════════════════════════════════════════════════════════ */

// ── Section Title ────────────────────────────────────────────
export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-text">{children}</h3>
      {sub && <p className="text-[11px] text-text-dim mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Field Group ──────────────────────────────────────────────
interface FieldGroupProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function FieldGroup({ label, required, children, hint }: FieldGroupProps) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">
        {label}
        {required && <span className="text-red ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-text-dim mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────
export function AyarInput({
  disabled,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      disabled={disabled}
      className={`w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${props.className || ''}`}
    />
  );
}

// ── Textarea ─────────────────────────────────────────────────
export function AyarTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold resize-none ${props.className || ''}`}
    />
  );
}

// ── Select ───────────────────────────────────────────────────
export function AyarSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold ${props.className || ''}`}
    />
  );
}

// ── Status Message ───────────────────────────────────────────
export function StatusMessage({ mesaj }: { mesaj: string }) {
  if (!mesaj) return null;
  const basarili = mesaj.includes('güncellendi') || mesaj.includes('kaydedildi') || mesaj.includes('başarı') || mesaj.includes('silindi') || mesaj.includes('aktarıldı');
  return (
    <div className={`text-xs px-3 py-2 rounded-lg ${basarili ? 'bg-green-dim text-green' : 'bg-red-dim text-red'}`}>
      {mesaj}
    </div>
  );
}

// ── Save Button ──────────────────────────────────────────────
export function SaveButton({
  onClick,
  disabled,
  label = 'Kaydet',
  loadingLabel = 'Kaydediliyor...',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors disabled:opacity-50"
    >
      {disabled ? loadingLabel : label}
    </button>
  );
}

// ── Danger Button ────────────────────────────────────────────
export function DangerButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-red/10 border border-red/30 text-red font-semibold rounded-lg text-xs hover:bg-red/20 transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ── Empty State ──────────────────────────────────────────────
export function AyarlarEmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div className="text-center py-12">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm text-text-muted">{text}</p>
      {sub && <p className="text-[11px] text-text-dim mt-1">{sub}</p>}
    </div>
  );
}

// ── Toggle Switch ────────────────────────────────────────────
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left py-2 group"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-gold' : 'bg-border'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-text group-hover:text-gold transition-colors">{label}</div>
        {description && <div className="text-[10px] text-text-dim">{description}</div>}
      </div>
    </button>
  );
}

// ── Separator ────────────────────────────────────────────────
export function Separator() {
  return <div className="border-t border-border/50 my-4" />;
}

// ── Badge ────────────────────────────────────────────────────
export function Badge({ children, color = 'gold' }: { children: ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    gold: 'text-gold bg-gold-dim',
    green: 'text-green bg-green-dim',
    red: 'text-red bg-red/10',
    blue: 'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    gray: 'text-text-muted bg-surface2',
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colorMap[color] || colorMap.gold}`}>
      {children}
    </span>
  );
}
