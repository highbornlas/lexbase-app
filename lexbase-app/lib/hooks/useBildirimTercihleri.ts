'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';
import { useEffect, useState } from 'react';

export interface BildirimTercihleri {
  id?: string;
  kullanici_auth_id?: string;
  buro_id?: string;
  // Bildirim turleri
  durusma_hatirlatma: boolean;
  sure_uyari: boolean;
  gorev_atama: boolean;
  gorev_yaklasan: boolean;
  onay_talebi: boolean;
  finans_uyari: boolean;
  // Kanallar
  uygulama_ici: boolean;
  eposta: boolean;
  // Zamanlama
  durusma_gun_once: number;
  sure_gun_once: number;
  // Sessiz saatler
  sessiz_baslangic: string;
  sessiz_bitis: string;
}

export const VARSAYILAN_TERCIHLER: BildirimTercihleri = {
  durusma_hatirlatma: true,
  sure_uyari: true,
  gorev_atama: true,
  gorev_yaklasan: true,
  onay_talebi: true,
  finans_uyari: true,
  uygulama_ici: true,
  eposta: false,
  durusma_gun_once: 1,
  sure_gun_once: 3,
  sessiz_baslangic: '22:00',
  sessiz_bitis: '07:00',
};

/**
 * Kullanicinin bildirim tercihlerini ceker.
 * Tercih yoksa varsayilan degerler doner.
 */
export function useBildirimTercihleri() {
  const buroId = useBuroId();
  const [authId, setAuthId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAuthId(data.user.id);
    });
  }, []);

  return useQuery<BildirimTercihleri>({
    queryKey: ['bildirim-tercihleri', buroId, authId],
    queryFn: async () => {
      if (!buroId || !authId) return VARSAYILAN_TERCIHLER;
      const supabase = createClient();

      const { data, error } = await supabase
        .from('bildirim_tercihleri')
        .select('*')
        .eq('kullanici_auth_id', authId)
        .maybeSingle();

      // Tablo henuz yoksa veya kayit yoksa varsayilan don
      if (error && error.code === '42P01') return VARSAYILAN_TERCIHLER;
      if (error) throw error;
      if (!data) return VARSAYILAN_TERCIHLER;

      return data as BildirimTercihleri;
    },
    enabled: !!buroId && !!authId,
    staleTime: 60000,
  });
}

/**
 * Bildirim tercihlerini kaydeder (upsert).
 * Kayit yoksa olusturur, varsa gunceller.
 */
export function useBildirimTercihiKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();
  const [authId, setAuthId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAuthId(data.user.id);
    });
  }, []);

  return useMutation({
    mutationFn: async (tercihler: Partial<BildirimTercihleri>) => {
      if (!buroId || !authId) throw new Error('Oturum bulunamadi');
      const supabase = createClient();

      // Mevcut kayit var mi kontrol et
      const { data: mevcut } = await supabase
        .from('bildirim_tercihleri')
        .select('id')
        .eq('kullanici_auth_id', authId)
        .maybeSingle();

      if (mevcut) {
        // Guncelle
        const { error } = await supabase
          .from('bildirim_tercihleri')
          .update({
            ...tercihler,
            updated_at: new Date().toISOString(),
          })
          .eq('kullanici_auth_id', authId);
        if (error) throw error;
      } else {
        // Yeni olustur
        const { error } = await supabase
          .from('bildirim_tercihleri')
          .insert({
            kullanici_auth_id: authId,
            buro_id: buroId,
            ...VARSAYILAN_TERCIHLER,
            ...tercihler,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirim-tercihleri', buroId, authId] });
    },
  });
}
