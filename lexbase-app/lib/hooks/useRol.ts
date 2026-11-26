'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { startRoleResolution, type RoleState, type Rol } from '@/lib/auth/roleResolution';
export type { Rol } from '@/lib/auth/roleResolution';

/* ══════════════════════════════════════════════════════════════
   Rol & Yetki Sistemi
   ══════════════════════════════════════════════════════════════ */

export function useRol(): RoleState & { yenile: () => void } {
  const [state, setState] = useState<RoleState>({ rol: null, loading: true, error: null });
  const controller = useRef<ReturnType<typeof startRoleResolution> | null>(null);

  useEffect(() => {
    controller.current = startRoleResolution(createClient(),
      () => localStorage.getItem('lb_aktif_buro_id'), setState);
    const refresh = () => { void controller.current?.refresh(); };
    const storage = (event: StorageEvent) => { if (event.key === 'lb_aktif_buro_id') refresh(); };
    window.addEventListener('online', refresh);
    window.addEventListener('storage', storage);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('storage', storage);
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);

  return { ...state, yenile: () => { void controller.current?.refresh(); } };
}
export const ROL_ETIKETLERI: Record<Rol, { label: string; kisa: string; renk: string }> = {
  sahip: { label: 'Büro Sahibi', kisa: 'Sahip', renk: 'text-gold bg-gold-dim border-gold/20' },
  yonetici: { label: 'Yönetici', kisa: 'Yön.', renk: 'text-gold bg-gold-dim border-gold/20' },
  avukat: { label: 'Avukat', kisa: 'Av.', renk: 'text-green bg-green-dim border-green/20' },
  stajyer: { label: 'Stajyer', kisa: 'Stj.', renk: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  sekreter: { label: 'Sekreter', kisa: 'Sek.', renk: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
};

// ── Yetki Haritası ────────────────────────────────────────────
const YETKI_HARITASI: Record<Rol, Set<string>> = {
  sahip: new Set([
    'muvekkil:oku', 'muvekkil:ekle', 'muvekkil:duzenle', 'muvekkil:sil',
    'dosya:oku', 'dosya:ekle', 'dosya:duzenle', 'dosya:sil',
    'finans:oku', 'finans:ekle', 'finans:duzenle',
    'belge:oku', 'belge:yukle', 'belge:sil',
    'gorev:oku', 'gorev:ekle', 'gorev:duzenle', 'gorev:sil',
    'takvim:oku', 'takvim:ekle', 'takvim:duzenle',
    'iletisim:oku', 'iletisim:ekle',
    'danismanlik:oku', 'danismanlik:ekle', 'danismanlik:duzenle',
    'rapor:oku', 'rapor:export',
    'ayarlar:oku', 'ayarlar:duzenle',
    'kullanici:yonet',
    'audit:oku',
    'toplu:sil', 'toplu:export',
    'buro:yonet', 'buro:sil',
  ]),
  yonetici: new Set([
    'muvekkil:oku', 'muvekkil:ekle', 'muvekkil:duzenle', 'muvekkil:sil',
    'dosya:oku', 'dosya:ekle', 'dosya:duzenle', 'dosya:sil',
    'finans:oku', 'finans:ekle', 'finans:duzenle',
    'belge:oku', 'belge:yukle', 'belge:sil',
    'gorev:oku', 'gorev:ekle', 'gorev:duzenle', 'gorev:sil',
    'takvim:oku', 'takvim:ekle', 'takvim:duzenle',
    'iletisim:oku', 'iletisim:ekle',
    'danismanlik:oku', 'danismanlik:ekle', 'danismanlik:duzenle',
    'rapor:oku', 'rapor:export',
    'ayarlar:oku', 'ayarlar:duzenle',
    'kullanici:yonet',
    'audit:oku',
    'toplu:sil', 'toplu:export',
  ]),
  avukat: new Set([
    'muvekkil:oku', 'muvekkil:ekle', 'muvekkil:duzenle', 'muvekkil:sil',
    'dosya:oku', 'dosya:ekle', 'dosya:duzenle', 'dosya:sil',
    'finans:oku', 'finans:ekle', 'finans:duzenle',
    'belge:oku', 'belge:yukle', 'belge:sil',
    'gorev:oku', 'gorev:ekle', 'gorev:duzenle', 'gorev:sil',
    'takvim:oku', 'takvim:ekle', 'takvim:duzenle',
    'iletisim:oku', 'iletisim:ekle',
    'danismanlik:oku', 'danismanlik:ekle', 'danismanlik:duzenle',
    'rapor:oku', 'rapor:export',
    'audit:oku',
    'toplu:sil', 'toplu:export',
  ]),
  stajyer: new Set([
    'muvekkil:oku',
    'dosya:oku',
    'belge:oku', 'belge:yukle',
    'gorev:oku', 'gorev:ekle', 'gorev:duzenle',
    'takvim:oku',
    'iletisim:oku',
    'danismanlik:oku',
    // finans:oku YOK — stajyer finans göremez
    // ayarlar:oku YOK — stajyer ayarlara erişemez
    // kullanici:yonet YOK — stajyer personel yönetemez
  ]),
  sekreter: new Set([
    'muvekkil:oku',
    'dosya:oku',
    'belge:oku', 'belge:yukle',
    'gorev:oku', 'gorev:ekle', 'gorev:duzenle',
    'takvim:oku', 'takvim:ekle', 'takvim:duzenle',
    'iletisim:oku', 'iletisim:ekle',
    'danismanlik:oku',
    // finans:oku YOK — sekreter finans göremez
    // kullanici:yonet YOK — sekreter personel yönetemez
    'ayarlar:oku',
    'toplu:export',
  ]),
};

// ── useRol — Aktif bürodaki rolü döndürür ──────────────────────
// Önce uyelikler tablosundan aktif bürodaki rolü arar,
// bulamazsa kullanicilar tablosundan fallback yapar.

// ── useYetki — Belirli bir yetkiye sahip mi? ──────────────────
export function useYetki(yetki: string): { yetkili: boolean; loading: boolean } {
  const { rol, loading } = useRol();
  if (loading || !rol) return { yetkili: false, loading };
  return { yetkili: YETKI_HARITASI[rol]?.has(yetki) ?? false, loading: false };
}

// ── yetkiVar — Non-hook versiyon (rol biliniyorsa) ────────────
export function yetkiVar(rol: Rol, yetki: string): boolean {
  return YETKI_HARITASI[rol]?.has(yetki) ?? false;
}
