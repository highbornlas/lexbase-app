'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { createDraftStorage } from '@/lib/utils/modalDraftStorage';

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

export function useModalDraft<T extends Record<string, unknown>>(
  draftKey: string,
  form: T,
  initialForm: T,
  open: boolean,
) {
  const storageKey = `${DRAFT_PREFIX}${draftKey}`;
  const storage = useMemo(() => createDraftStorage(storageKey), [storageKey]);

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
    storage.schedule(form);
    return storage.cancel;
  }, [form, open, isDirty, storage]);

  // ── Draft okuma ─────────────────────────────────────────────
  const hasDraft = useCallback((): boolean => {
    return storage.has();
  }, [storage]);

  const loadDraft = useCallback((): T | null => {
    return storage.load() as T | null;
  }, [storage]);

  // ── Draft temizleme ─────────────────────────────────────────
  const clearDraft = useCallback(() => {
    storage.clear();
  }, [storage]);

  const saveDraft = useCallback(() => storage.save(form), [storage, form]);

  return { isDirty, hasDraft, loadDraft, clearDraft, saveDraft };
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
