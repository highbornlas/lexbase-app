'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

export interface Personel {
  id: string;
  ad?: string;
  rol?: 'sahip' | 'yonetici' | 'avukat' | 'stajyer' | 'sekreter';
  email?: string;
  tel?: string;
  tc?: string;
  baro?: string;
  baroSicil?: string;
  baslama?: string;
  durum?: 'aktif' | 'davet_gonderildi' | 'pasif';
  notlar?: string;
  yetkiler?: Record<string, string>;
  [key: string]: unknown;
}

export function usePersoneller() {
  const buroId = useBuroId();

  return useQuery<Personel[]>({
    queryKey: ['personel', buroId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from('personel')
        .select('id, data')
        .eq('buro_id', buroId);
      if (error) throw error;
      return (data || []).map((r) => ({ id: r.id, ...(r.data as object) })) as Personel[];
    },
    enabled: !!buroId,
  });
}

export function usePersonel(id: string | null) {
  const buroId = useBuroId();

  return useQuery<Personel | null>({
    queryKey: ['personel-detay', id, buroId],
    queryFn: async () => {
      if (!buroId || !id) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('personel')
        .select('id, data')
        .eq('buro_id', buroId)
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return null;
      return { id: data.id, ...(data.data as object) } as Personel;
    },
    enabled: !!buroId && !!id,
  });
}

export function usePersonelKaydet() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kayit: Personel) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { id, ...data } = kayit;
      const { error } = await supabase.from('personel').upsert({ id, buro_id: buroId, data });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['personel'] });
    },
  });
}

export function usePersonelSil() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      // 1. Personelin bilgilerini al (bildirim + uyelik için)
      const { data: personelData } = await supabase
        .from('personel')
        .select('data')
        .eq('id', id)
        .eq('buro_id', buroId)
        .single();

      const data = personelData?.data as Record<string, unknown> | null;
      const ad = (data?.ad as string) || '(adsız)';

      // 2. Büro geneline bildirim gönder (silme öncesi)
      try {
        await supabase.from('bildirimler').insert({
          id: crypto.randomUUID(),
          buro_id: buroId,
          tip: 'sistem',
          baslik: '👤 Personel çıkarıldı',
          mesaj: `${ad} ekipten çıkarıldı.`,
          link: '/personel',
          okundu: false,
        });
      } catch {
        // Bildirim hatası silme işlemini engellemesin
      }

      // 3. Personel kaydını sil
      const { error } = await supabase
        .from('personel')
        .delete()
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['personel'] });
    },
  });
}
