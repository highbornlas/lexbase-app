import { type ClassValue, clsx } from 'clsx';

// ── Para formatı (Türk Lirası) ────────────────────────────────
export function fmt(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '₺0';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

// ── Tarih formatı ─────────────────────────────────────────────
export function fmtTarih(tarih: string | null | undefined): string {
  if (!tarih) return '';
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(tarih));
  } catch {
    return tarih;
  }
}

// ── HTML escape ───────────────────────────────────────────────
export function escHTML(str: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = str;
    return div.innerHTML;
  }
  return str.replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[m] || m;
  });
}

// ── cn helper (Tailwind class merge) ──────────────────────────
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
