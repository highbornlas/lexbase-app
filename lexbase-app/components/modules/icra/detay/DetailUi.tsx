'use client';

import { fmt } from "@/lib/utils";

export function SectionHeader({ title, className }: { title: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{title}</h4>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

export function OzetSatir({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs text-text font-medium truncate" title={value}>{value}</div>
    </div>
  );
}

export function FinansKart({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{fmt(value)}</div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <span className="text-text font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

export function EmptyTab({ icon, message, action, onAction }: { icon: React.ReactNode; message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="flex justify-center mb-3">{icon}</div>
      <div className="text-xs text-text-muted mb-3">{message}</div>
      {action && onAction && (
        <button onClick={onAction} className="px-4 py-2 bg-gold text-bg text-xs font-semibold rounded-lg hover:bg-gold-light transition-colors">
          {action}
        </button>
      )}
    </div>
  );
}
