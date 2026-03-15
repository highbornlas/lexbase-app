'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getAktifBuroId, setAktifBuroId } from './useUyelik';

/**
 * Giriş yapmış kullanıcının aktif buro_id'sini döndürür.
 *
 * Öncelik sırası:
 * 1. localStorage'daki seçili büro (çoklu büro desteği)
 * 2. uyelikler tablosundan ilk aktif üyelik
 * 3. kullanicilar tablosundan buro_id (eski uyumluluk)
 * 4. user_metadata fallback
 */
export function useBuroId(): string | null {
  const [buroId, setBuroId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // 1. localStorage'dan seçili büro
      const stored = getAktifBuroId();
      if (stored) {
        // Geçerliliğini doğrula
        const { data: uyelik } = await supabase
          .from('uyelikler')
          .select('buro_id')
          .eq('auth_id', user.id)
          .eq('buro_id', stored)
          .eq('durum', 'aktif')
          .single();

        if (!cancelled && uyelik) {
          setBuroId(uyelik.buro_id);
          return;
        }
      }

      // 2. uyelikler tablosundan ilk aktif üyelik
      const { data: uyelikler } = await supabase
        .from('uyelikler')
        .select('buro_id')
        .eq('auth_id', user.id)
        .eq('durum', 'aktif')
        .order('created_at', { ascending: true })
        .limit(1);

      if (!cancelled && uyelikler && uyelikler.length > 0) {
        const bId = uyelikler[0].buro_id;
        setAktifBuroId(bId); // localStorage'a kaydet
        setBuroId(bId);
        return;
      }

      // 3. Eski uyumluluk: kullanicilar tablosundan
      const { data: kul } = await supabase
        .from('kullanicilar')
        .select('buro_id')
        .eq('auth_id', user.id)
        .single();

      if (!cancelled && kul?.buro_id) {
        setAktifBuroId(kul.buro_id);
        setBuroId(kul.buro_id);
        return;
      }

      // 4. Fallback: user_metadata
      const fallback = user.user_metadata?.buro_id
        || user.app_metadata?.buro_id
        || null;
      if (!cancelled) {
        if (fallback) setAktifBuroId(fallback);
        setBuroId(fallback);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return buroId;
}

/**
 * Kullanıcı bilgilerini döndürür (ad, rol, vb.)
 */
export function useKullanici() {
  const [kullanici, setKullanici] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: kul } = await supabase
        .from('kullanicilar')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (!cancelled && kul) {
        setKullanici(kul);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return kullanici;
}
