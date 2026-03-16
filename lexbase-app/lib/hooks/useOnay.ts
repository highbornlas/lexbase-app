'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useBuroId } from './useBuro';
import { useEffect, useState } from 'react';

/* ══════════════════════════════════════════════════════════════
   Onay Mekanizması — Maker/Checker prensibi

   Avukat masraf girer → beklemede → yönetici onaylar → finansa yansır
   ══════════════════════════════════════════════════════════════ */

export interface OnayTalebi {
  id: string;
  buro_id: string;
  talep_eden_auth_id: string;
  talep_tarihi: string;
  modul: 'finans' | 'dava' | 'belge' | 'personel';
  islem_tipi: string;
  hedef_tablo: string;
  hedef_kayit_id?: string;
  veri: Record<string, unknown>;
  aciklama?: string;
  ekler?: string[];
  durum: 'beklemede' | 'onaylandi' | 'reddedildi';
  onaylayan_auth_id?: string;
  onay_tarihi?: string;
  red_nedeni?: string;
  tutar?: number;
  created_at: string;
  // Join'den gelen
  talep_eden_ad?: string;
}

export interface OnayAyarlari {
  id: string;
  buro_id: string;
  masraf_onay_aktif: boolean;
  masraf_onay_esik: number;
  tahsilat_onay_aktif: boolean;
  buro_gideri_onay_aktif: boolean;
  fatura_onay_aktif: boolean;
  dava_acma_onay_aktif: boolean;
  dosya_kapatma_onay_aktif: boolean;
  yonetici_onaysiz: boolean;
  sahip_onaysiz: boolean;
}

const VARSAYILAN_AYARLAR: Omit<OnayAyarlari, 'id' | 'buro_id'> = {
  masraf_onay_aktif: true,
  masraf_onay_esik: 500,
  tahsilat_onay_aktif: true,
  buro_gideri_onay_aktif: true,
  fatura_onay_aktif: false,
  dava_acma_onay_aktif: false,
  dosya_kapatma_onay_aktif: false,
  yonetici_onaysiz: true,
  sahip_onaysiz: true,
};

// ── İşlem tipi etiketleri ─────────────────────────────────────
export const ISLEM_ETIKETLERI: Record<string, { label: string; icon: string; renk: string }> = {
  masraf_ekle: { label: 'Masraf Girişi', icon: '💸', renk: 'text-red' },
  tahsilat_kaydi: { label: 'Tahsilat Kaydı', icon: '💰', renk: 'text-green' },
  buro_gideri: { label: 'Büro Gideri', icon: '🏢', renk: 'text-gold' },
  fatura_olustur: { label: 'Fatura', icon: '🧾', renk: 'text-blue-400' },
  dava_ac: { label: 'Dava Açma', icon: '📁', renk: 'text-purple-400' },
  dosya_kapat: { label: 'Dosya Kapatma', icon: '📦', renk: 'text-text-muted' },
};

// ══════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════

/**
 * Onay ayarlarını çeker. Yoksa varsayılan oluşturur.
 */
export function useOnayAyarlari() {
  const buroId = useBuroId();

  return useQuery<OnayAyarlari>({
    queryKey: ['onay-ayarlari', buroId],
    queryFn: async () => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('onay_ayarlari')
        .select('*')
        .eq('buro_id', buroId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Kayıt yok — varsayılan oluştur
        const { data: yeni, error: err2 } = await supabase
          .from('onay_ayarlari')
          .insert({ buro_id: buroId, ...VARSAYILAN_AYARLAR })
          .select()
          .single();
        if (err2) throw err2;
        return yeni as OnayAyarlari;
      }
      if (error) throw error;
      return data as OnayAyarlari;
    },
    enabled: !!buroId,
    staleTime: 60000,
  });
}

/**
 * Onay ayarlarını günceller.
 */
export function useOnayAyarlariGuncelle() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ayarlar: Partial<OnayAyarlari>) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();
      const { error } = await supabase
        .from('onay_ayarlari')
        .update({ ...ayarlar, updated_at: new Date().toISOString() })
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['onay-ayarlari', buroId] });
    },
  });
}

/**
 * Bekleyen onay taleplerini çeker.
 */
export function useOnayTalepleri(filtre?: { durum?: string; modul?: string }) {
  const buroId = useBuroId();

  return useQuery<OnayTalebi[]>({
    queryKey: ['onay-talepleri', buroId, filtre],
    queryFn: async () => {
      if (!buroId) return [];
      const supabase = createClient();

      let query = supabase
        .from('onay_kuyrugu')
        .select('*')
        .eq('buro_id', buroId)
        .order('talep_tarihi', { ascending: false });

      if (filtre?.durum) {
        query = query.eq('durum', filtre.durum);
      }
      if (filtre?.modul) {
        query = query.eq('modul', filtre.modul);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Talep eden adlarını çek
      const authIds = [...new Set((data || []).map((d) => d.talep_eden_auth_id))];
      if (authIds.length > 0) {
        const { data: kullanicilar } = await supabase
          .from('kullanicilar')
          .select('auth_id, ad')
          .in('auth_id', authIds);

        const adMap = new Map((kullanicilar || []).map((k) => [k.auth_id, k.ad]));

        return (data || []).map((d) => ({
          ...d,
          talep_eden_ad: adMap.get(d.talep_eden_auth_id) || 'Bilinmeyen',
        })) as OnayTalebi[];
      }

      return (data || []) as OnayTalebi[];
    },
    enabled: !!buroId,
    staleTime: 15000,
  });
}

/**
 * Bekleyen onay sayısı (sidebar badge için)
 */
export function useOnayBekleyenSayisi(): number {
  const { data } = useOnayTalepleri({ durum: 'beklemede' });
  return data?.length ?? 0;
}

/**
 * Yeni onay talebi oluştur.
 * Eğer kullanıcının rolü onaysız geçme hakkına sahipse, direkt onaylar.
 */
export function useOnayTalebiOlustur() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (talep: {
      modul: string;
      islem_tipi: string;
      hedef_tablo: string;
      hedef_kayit_id?: string;
      veri: Record<string, unknown>;
      aciklama?: string;
      ekler?: string[];
      tutar?: number;
    }) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      const { error } = await supabase.from('onay_kuyrugu').insert({
        buro_id: buroId,
        talep_eden_auth_id: user.id,
        ...talep,
      });

      if (error) throw error;

      // Yöneticilere bildirim gönder
      const { data: yoneticiler } = await supabase
        .from('uyelikler')
        .select('auth_id')
        .eq('buro_id', buroId)
        .eq('durum', 'aktif')
        .in('rol', ['sahip', 'yonetici']);

      if (yoneticiler && yoneticiler.length > 0) {
        const bildirimler = yoneticiler
          .filter((y) => y.auth_id !== user.id)
          .map((y) => ({
            buro_id: buroId,
            hedef_auth_id: y.auth_id,
            tip: 'sistem',
            baslik: 'Yeni onay talebi',
            mesaj: talep.aciklama || `${talep.islem_tipi} işlemi onayınızı bekliyor`,
            link: '/onaylar',
            okundu: false,
          }));

        if (bildirimler.length > 0) {
          await supabase.from('bildirimler').insert(bildirimler);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['onay-talepleri'] });
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] });
    },
  });
}

/**
 * Onay talebini onayla veya reddet.
 */
export function useOnayIslem() {
  const buroId = useBuroId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, karar, redNedeni }: { id: string; karar: 'onaylandi' | 'reddedildi'; redNedeni?: string }) => {
      if (!buroId) throw new Error('Büro bulunamadı');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      // Talebi güncelle
      const { data: talep, error } = await supabase
        .from('onay_kuyrugu')
        .update({
          durum: karar,
          onaylayan_auth_id: user.id,
          onay_tarihi: new Date().toISOString(),
          red_nedeni: karar === 'reddedildi' ? redNedeni : null,
        })
        .eq('id', id)
        .eq('buro_id', buroId)
        .eq('durum', 'beklemede')
        .select()
        .single();

      if (error) throw error;
      if (!talep) throw new Error('Talep bulunamadı veya zaten işlenmiş');

      // Onaylandıysa asıl tabloya yaz
      if (karar === 'onaylandi' && talep.veri) {
        const { error: insertErr } = await supabase
          .from(talep.hedef_tablo)
          .upsert({
            id: talep.hedef_kayit_id || undefined,
            buro_id: buroId,
            data: talep.veri,
          });

        if (insertErr) {
          console.error('Onaylanan kayıt yazılamadı:', insertErr);
          // Geri al
          await supabase
            .from('onay_kuyrugu')
            .update({ durum: 'beklemede', onaylayan_auth_id: null, onay_tarihi: null })
            .eq('id', id);
          throw new Error(`Kayıt oluşturulamadı: ${insertErr.message}`);
        }
      }

      // Talep edene bildirim gönder
      const durumText = karar === 'onaylandi' ? 'onaylandı ✅' : 'reddedildi ❌';
      await supabase.from('bildirimler').insert({
        buro_id: buroId,
        hedef_auth_id: talep.talep_eden_auth_id,
        tip: 'sistem',
        baslik: `İşleminiz ${durumText}`,
        mesaj: karar === 'reddedildi' && redNedeni
          ? `${talep.aciklama || talep.islem_tipi} — Red nedeni: ${redNedeni}`
          : talep.aciklama || talep.islem_tipi,
        link: '/onaylar',
        okundu: false,
      });

      return talep;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['onay-talepleri'] });
      queryClient.invalidateQueries({ queryKey: ['bildirimler'] });
      // İlgili modül verisini de yenile
      queryClient.invalidateQueries({ queryKey: ['masraflar'] });
      queryClient.invalidateQueries({ queryKey: ['tahsilatlar'] });
      queryClient.invalidateQueries({ queryKey: ['finans'] });
    },
  });
}

/**
 * Onay gerekiyor mu kontrol et.
 * Kullanıcının rolüne ve büro ayarlarına göre karar verir.
 */
export function useOnayGerekliMi() {
  const { data: ayarlar } = useOnayAyarlari();
  const [authId, setAuthId] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const buroId = useBuroId();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAuthId(user.id);

      if (buroId) {
        const { data: uyelik } = await supabase
          .from('uyelikler')
          .select('rol')
          .eq('auth_id', user.id)
          .eq('buro_id', buroId)
          .eq('durum', 'aktif')
          .single();
        setRol(uyelik?.rol || 'avukat');
      }
    })();
  }, [buroId]);

  /**
   * Belirli bir işlem için onay gerekli mi?
   */
  function kontrol(islemTipi: string, tutar?: number): boolean {
    if (!ayarlar) return false; // Ayarlar yüklenmediyse onaysız geç

    // Sahip onaysız
    if (rol === 'sahip' && ayarlar.sahip_onaysiz) return false;
    // Yönetici onaysız
    if (rol === 'yonetici' && ayarlar.yonetici_onaysiz) return false;

    switch (islemTipi) {
      case 'masraf_ekle':
        if (!ayarlar.masraf_onay_aktif) return false;
        if (tutar && tutar < ayarlar.masraf_onay_esik) return false;
        return true;

      case 'tahsilat_kaydi':
        return ayarlar.tahsilat_onay_aktif;

      case 'buro_gideri':
        return ayarlar.buro_gideri_onay_aktif;

      case 'fatura_olustur':
        return ayarlar.fatura_onay_aktif;

      case 'dava_ac':
        return ayarlar.dava_acma_onay_aktif;

      case 'dosya_kapat':
        return ayarlar.dosya_kapatma_onay_aktif;

      default:
        return false;
    }
  }

  return { kontrol, ayarlar, rol, authId };
}
