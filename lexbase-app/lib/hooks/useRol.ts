'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Rol & Yetki Sistemi
   ══════════════════════════════════════════════════════════════ */

export type Rol = 'sahip' | 'yonetici' | 'avukat' | 'stajyer' | 'sekreter';

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
export function useRol(): { rol: Rol | null; loading: boolean } {
  const [rol, setRol] = useState<Rol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const GECERLI_ROLLER: Rol[] = ['sahip', 'yonetici', 'avukat', 'stajyer', 'sekreter'];

      // 1. Aktif büro seçiliyse uyelikler'den rolü al
      const aktifBuroId = typeof window !== 'undefined'
        ? localStorage.getItem('lb_aktif_buro_id')
        : null;

      if (aktifBuroId) {
        const { data: uyelik } = await supabase
          .from('uyelikler')
          .select('rol')
          .eq('auth_id', user.id)
          .eq('buro_id', aktifBuroId)
          .eq('durum', 'aktif')
          .single();

        if (!cancelled && uyelik?.rol && GECERLI_ROLLER.includes(uyelik.rol as Rol)) {
          setRol(uyelik.rol as Rol);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: kullanicilar tablosundan
      const { data: kul } = await supabase
        .from('kullanicilar')
        .select('rol')
        .eq('auth_id', user.id)
        .single();

      if (!cancelled) {
        if (kul?.rol && GECERLI_ROLLER.includes(kul.rol as Rol)) {
          setRol(kul.rol as Rol);
        } else {
          setRol('avukat');
        }
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { rol, loading };
}

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
