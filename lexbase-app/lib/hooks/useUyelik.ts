'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Üyelik Sistemi — Çoklu büro desteği

   Bir kullanıcı birden fazla büroya üye olabilir.
   Aktif büro seçimi localStorage'da tutulur.
   ══════════════════════════════════════════════════════════════ */

export interface Uyelik {
  id: string;
  auth_id: string;
  buro_id: string;
  rol: string;
  durum: string;
  created_at: string;
  buro_ad?: string; // join ile gelir
}

const LS_AKTIF_BURO_KEY = 'lb_aktif_buro_id';

// ── Aktif büro ID'sini al/set et ──────────────────────────────
export function getAktifBuroId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LS_AKTIF_BURO_KEY);
}

export function setAktifBuroId(buroId: string) {
  localStorage.setItem(LS_AKTIF_BURO_KEY, buroId);
}

export function clearAktifBuroId() {
  localStorage.removeItem(LS_AKTIF_BURO_KEY);
}

// ── useUyelikler — Kullanıcının tüm büro üyeliklerini döndürür ──
export function useUyelikler() {
  return useQuery<Uyelik[]>({
    queryKey: ['uyelikler'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('uyelikler')
        .select('*, burolar(ad)')
        .eq('auth_id', user.id)
        .in('durum', ['aktif', 'davet_gonderildi'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((u: Record<string, unknown>) => ({
        ...u,
        buro_ad: (u.burolar as Record<string, unknown>)?.ad as string || 'Bilinmeyen Büro',
      })) as Uyelik[];
    },
    staleTime: 5 * 60 * 1000, // 5 dk cache
  });
}

// ── useAktifUyelik — Seçili bürodaki üyelik bilgisini döndürür ──
export function useAktifUyelik() {
  const { data: uyelikler, isLoading } = useUyelikler();
  const [aktifBuroId, setAktif] = useState<string | null>(null);

  useEffect(() => {
    const stored = getAktifBuroId();
    setAktif(stored);
  }, []);

  // Aktif büro seçili değilse veya geçersizse ilk üyeliği seç
  useEffect(() => {
    if (!uyelikler || uyelikler.length === 0) return;

    const stored = getAktifBuroId();
    const valid = uyelikler.find((u) => u.buro_id === stored);

    if (!valid) {
      // İlk aktif üyeliği seç
      const ilk = uyelikler.find((u) => u.durum === 'aktif') || uyelikler[0];
      setAktifBuroId(ilk.buro_id);
      setAktif(ilk.buro_id);
    }
  }, [uyelikler]);

  const aktifUyelik = uyelikler?.find((u) => u.buro_id === aktifBuroId) || null;

  const buroSec = useCallback((buroId: string) => {
    setAktifBuroId(buroId);
    setAktif(buroId);
    // Sayfayı yenile — tüm hook'lar yeni buro_id ile tekrar fetch yapacak
    window.location.reload();
  }, []);

  return {
    uyelikler: uyelikler || [],
    aktifUyelik,
    aktifBuroId,
    cokluBuro: (uyelikler?.length || 0) > 1,
    isLoading,
    buroSec,
  };
}
