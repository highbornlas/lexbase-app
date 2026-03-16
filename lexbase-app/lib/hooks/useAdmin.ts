'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   useAdmin — Platform admin hook'ları

   Superadmin yetkisini Supabase'den doğrular,
   admin paneli için gerekli tüm veri çekme/yazma işlemlerini sağlar.
   ══════════════════════════════════════════════════════════════ */

export type AdminSeviye = 'admin' | 'super';

interface AdminBilgi {
  auth_id: string;
  ad: string;
  email: string;
  yetki_seviye: AdminSeviye;
  created_at: string;
}

// ── Admin mi kontrolü (basit boolean) ────────────────────────
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('platform_adminler')
        .select('auth_id')
        .eq('auth_id', user.id)
        .single();

      if (!cancelled) {
        setIsAdmin(!!data);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { isAdmin, loading };
}

// ── Admin bilgilerini getir (auth user'dan) ─────────────────
export function useAdminBilgi(): { admin: AdminBilgi | null; loading: boolean } {
  const [admin, setAdmin] = useState<AdminBilgi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      // Auth user bilgisinden admin bilgisi oluştur
      // Gerçek güvenlik Cloudflare Access ile sağlanır
      if (!cancelled) {
        setAdmin({
          auth_id: user.id,
          ad: user.user_metadata?.ad || user.email?.split('@')[0] || 'Admin',
          email: user.email || '',
          yetki_seviye: 'super',
          created_at: user.created_at,
        });
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { admin, loading };
}

// ── Platform İstatistikleri (Dashboard KPI) ──────────────────
export function usePlatformIstatistik() {
  return useQuery({
    queryKey: ['admin', 'platform-istatistik'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('admin_platform_istatistik');
      if (error) throw error;
      return data as {
        toplam_buro: number;
        toplam_kullanici: number;
        toplam_dava: number;
        toplam_icra: number;
        toplam_muvekkil: number;
        aktif_abonelik: number;
        bekleyen_destek: number;
        aktif_duyuru: number;
        bugunki_giris: number;
        haftalik_giris: number;
      };
    },
    staleTime: 30_000, // 30 saniye cache
  });
}

// ── Tüm Büroları Getir (admin) ──────────────────────────────
export function useAdminBurolar() {
  return useQuery({
    queryKey: ['admin', 'burolar'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('burolar')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Tüm Kullanıcıları Getir (admin) ─────────────────────────
export function useAdminKullanicilar() {
  return useQuery({
    queryKey: ['admin', 'kullanicilar'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('kullanicilar')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Abonelikler ──────────────────────────────────────────────
export function useAdminAbonelikler() {
  return useQuery({
    queryKey: ['admin', 'abonelikler'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('abonelikler')
        .select('*, buro:buro_id(id, data), plan:plan_id(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Plan Limitleri ───────────────────────────────────────────
export function useAdminPlanlar() {
  return useQuery({
    queryKey: ['admin', 'planlar'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('plan_limitleri')
        .select('*')
        .order('sirasi', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// ── Plan Kaydet (ekle/güncelle) ──────────────────────────────
export function useAdminPlanKaydet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Record<string, unknown>) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('plan_limitleri')
        .upsert({ ...plan, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'planlar'] }),
  });
}

// ── Destek Talepleri ─────────────────────────────────────────
export function useAdminDestekTalepleri() {
  return useQuery({
    queryKey: ['admin', 'destek'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('destek_talepleri')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Platform Duyuruları ──────────────────────────────────────
export function useAdminDuyurular() {
  return useQuery({
    queryKey: ['admin', 'duyurular'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('platform_duyurular')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Lisans Kodları ───────────────────────────────────────────
export function useAdminLisanslar() {
  return useQuery({
    queryKey: ['admin', 'lisanslar'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('lisans_kodlari')
        .select('*, plan:plan_id(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── İndirimler ───────────────────────────────────────────────
export function useAdminIndirimler() {
  return useQuery({
    queryKey: ['admin', 'indirimler'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('platform_indirimler')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ── Admin Audit Log ──────────────────────────────────────────
export function useAdminAuditLog(limit = 50) {
  return useQuery({
    queryKey: ['admin', 'audit-log', limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

// ── Admin Audit Log Yaz ──────────────────────────────────────
export function useAdminAuditYaz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kayit: {
      islem: string;
      hedef_tablo?: string;
      hedef_kayit_id?: string;
      detay?: Record<string, unknown>;
    }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { error } = await supabase.from('admin_audit_log').insert({
        admin_auth_id: user.id,
        ...kayit,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'audit-log'] }),
  });
}

// ── Platform Parametreleri ───────────────────────────────────
export function useAdminParametreler() {
  return useQuery({
    queryKey: ['admin', 'parametreler'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('platform_parametreler')
        .select('*')
        .order('kategori', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
