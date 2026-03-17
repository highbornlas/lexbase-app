'use client';

import { useEffect, useRef, useCallback } from 'react';

/* ══════════════════════════════════════════════════════════════
   useModalDraft — Modal taslak yönetimi + dirty detection

   Kullanım:
     const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
       'dava', form, initialForm, open
     );

   - form: mevcut form state (auto-save için)
   - initialForm: modal açılırken set edilen başlangıç verisi
   - open: modal açık mı
   - isDirty: form değişmiş mi
   - hasDraft: localStorage'da taslak var mı
   - loadDraft: taslağı yükle (döndürür veya null)
   - clearDraft: taslağı temizle
   ══════════════════════════════════════════════════════════════ */

const DRAFT_PREFIX = 'lb_draft_';
const DEBOUNCE_MS = 800;

export function useModalDraft<T extends Record<string, unknown>>(
  draftKey: string,
  form: T,
  initialForm: T,
  open: boolean,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `${DRAFT_PREFIX}${draftKey}`;

  // ── Dirty Detection ─────────────────────────────────────────
  const isDirty = (() => {
    try {
      return JSON.stringify(form) !== JSON.stringify(initialForm);
    } catch {
      return false;
    }
  })();

  // ── Auto-Save Draft (debounced) ─────────────────────────────
  useEffect(() => {
    if (!open || !isDirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(form));
      } catch { /* quota exceeded — ignore */ }
    }, DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [form, open, isDirty, storageKey]);

  // ── Draft okuma ─────────────────────────────────────────────
  const hasDraft = useCallback((): boolean => {
    try { return !!localStorage.getItem(storageKey); }
    catch { return false; }
  }, [storageKey]);

  const loadDraft = useCallback((): T | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch { return null; }
  }, [storageKey]);

  // ── Draft temizleme ─────────────────────────────────────────
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(storageKey); }
    catch { /* ignore */ }
  }, [storageKey]);

  return { isDirty, hasDraft, loadDraft, clearDraft };
}

/* ══════════════════════════════════════════════════════════════
   Yardımcı: Tüm taslakları listele / temizle (Ayarlar sayfası)
   ══════════════════════════════════════════════════════════════ */
export function getAllDrafts(): { key: string; data: unknown }[] {
  const drafts: { key: string; data: unknown }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        drafts.push({ key, data: JSON.parse(localStorage.getItem(key) || '{}') });
      }
    }
  } catch { /* ignore */ }
  return drafts;
}

export function clearAllDrafts(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
