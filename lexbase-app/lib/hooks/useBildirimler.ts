'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';

export interface Bildirim {
  id: string;
  buro_id: string;
  hedef_auth_id?: string;
  tip: string;     // 'durusma' | 'gorev' | 'dosya' | 'sure' | 'finans' | 'sistem'
  baslik: string;
  mesaj?: string;
  link?: string;
  okundu: boolean;
  olusturma: string;
}

/**
 * Bildirimleri çeker + Supabase Realtime ile dinler
 * Hem büro bazlı hem kişisel (hedef_auth_id) bildirimleri getirir
 */
export function useBildirimler() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();
  const [authId, setAuthId] = useState<string | null>(null);

  // Auth ID'yi al
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAuthId(data.user.id);
    });
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!buroId) return;

    const supabase = createClient();
    const channel = supabase
      .channel('bildirimler-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bildirimler',
        },
        () => {
          // Yeni bildirim gelince query'yi invalidate et
          queryClient.invalidateQueries({ queryKey: ['bildirimler', buroId, authId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [buroId, authId, queryClient]);

  return useQuery<Bildirim[]>({
    queryKey: ['bildirimler', buroId, authId],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();

      // Büro bazlı bildirimler (hedef_auth_id null olanlar = tüm büroya)
      const { data: buroBildirimler, error: err1 } = await supabase
        .from('bildirimler')
        .select('*')
        .eq('buro_id', buroId)
        .is('hedef_auth_id', null)
        .order('olusturma', { ascending: false })
        .limit(30);

      // Kişisel bildirimler (bana hedeflenmiş — herhangi bürodan)
      let kisiselBildirimler: Bildirim[] = [];
      if (authId) {
        const { data: kisisel } = await supabase
          .from('bildirimler')
          .select('*')
          .eq('hedef_auth_id', authId)
          .order('olusturma', { ascending: false })
          .limit(20);
        kisiselBildirimler = (kisisel || []) as Bildirim[];
      }

      if (err1 && err1.code === '42P01') return [];
      if (err1) throw err1;

      // Birleştir, tarihe göre sırala, tekrarları kaldır
      const tumBildirimler = [...(buroBildirimler || []), ...kisiselBildirimler] as Bildirim[];
      const benzersiz = Array.from(new Map(tumBildirimler.map(b => [b.id, b])).values());
      benzersiz.sort((a, b) => new Date(b.olusturma).getTime() - new Date(a.olusturma).getTime());

      return benzersiz.slice(0, 50);
    },
    enabled: !!buroId,
    staleTime: 30000,
  });
}

/**
 * Tek bildirimi okundu olarak işaretle
 */
export function useBildirimOkundu() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('bildirimler')
        .update({ okundu: true })
        .eq('id', id)
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['bildirimler', buroId] });
      const prev = queryClient.getQueryData<Bildirim[]>(['bildirimler', buroId]);
      if (prev) {
        queryClient.setQueryData(
          ['bildirimler', buroId],
          prev.map((b) => (b.id === id ? { ...b, okundu: true } : b))
        );
      }
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['bildirimler', buroId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler', buroId] });
    },
  });
}

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
/**
 * Bildirim gönderme helper'ı — client-side bildirim oluşturur
 * Personel değişiklikleri, silme, rol/durum güncellemelerinde kullanılır
 */
export function useBildirimGonder() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bildirim: {
      tip: string;
      baslik: string;
      mesaj?: string;
      link?: string;
      hedef_auth_id?: string | null; // null = büro geneline
    }) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase.from('bildirimler').insert({
        id: crypto.randomUUID(),
        buro_id: buroId,
        tip: bildirim.tip,
        baslik: bildirim.baslik,
        mesaj: bildirim.mesaj || null,
        link: bildirim.link || null,
        hedef_auth_id: bildirim.hedef_auth_id ?? null,
        okundu: false,
      });
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] });
    },
  });
}

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
export function useTumBildirimlerOku() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('bildirimler')
        .update({ okundu: true })
        .eq('buro_id', buroId)
        .eq('okundu', false);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['bildirimler', buroId] });
      const prev = queryClient.getQueryData<Bildirim[]>(['bildirimler', buroId]);
      if (prev) {
        queryClient.setQueryData(
          ['bildirimler', buroId],
          prev.map((b) => ({ ...b, okundu: true }))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['bildirimler', buroId], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bildirimler', buroId] });
    },
  });
}
