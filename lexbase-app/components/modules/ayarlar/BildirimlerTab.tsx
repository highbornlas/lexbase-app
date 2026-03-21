'use client';

import { useState, useEffect } from 'react';
import { SectionTitle, Toggle, Separator, StatusMessage, SaveButton } from './shared';
import {
  useBildirimTercihleri,
  useBildirimTercihiKaydet,
  VARSAYILAN_TERCIHLER,
  type BildirimTercihleri,
} from '@/lib/hooks/useBildirimTercihleri';

/* ══════════════════════════════════════════════════════════════
   Bildirimler Tab — DB destekli bildirim tercihleri
   ══════════════════════════════════════════════════════════════ */

export function BildirimlerTab() {
  const { data: dbTercihler, isLoading } = useBildirimTercihleri();
  const kaydetMut = useBildirimTercihiKaydet();

  const [tercihler, setTercihler] = useState<BildirimTercihleri>(VARSAYILAN_TERCIHLER);
  const [mesaj, setMesaj] = useState('');

  // DB'den gelen tercihleri forma yansit
  useEffect(() => {
    if (dbTercihler) {
      setTercihler({ ...VARSAYILAN_TERCIHLER, ...dbTercihler });
    }
  }, [dbTercihler]);

  function guncelle<K extends keyof BildirimTercihleri>(key: K, val: BildirimTercihleri[K]) {
    setTercihler((prev) => ({ ...prev, [key]: val }));
  }

  async function kaydet() {
    setMesaj('');
    try {
      await kaydetMut.mutateAsync({
        durusma_hatirlatma: tercihler.durusma_hatirlatma,
        sure_uyari: tercihler.sure_uyari,
        gorev_atama: tercihler.gorev_atama,
        gorev_yaklasan: tercihler.gorev_yaklasan,
        onay_talebi: tercihler.onay_talebi,
        finans_uyari: tercihler.finans_uyari,
        uygulama_ici: tercihler.uygulama_ici,
        eposta: tercihler.eposta,
        durusma_gun_once: tercihler.durusma_gun_once,
        sure_gun_once: tercihler.sure_gun_once,
        sessiz_baslangic: tercihler.sessiz_baslangic,
        sessiz_bitis: tercihler.sessiz_bitis,
      });
      setMesaj('Bildirim tercihleri kaydedildi.');
    } catch {
      setMesaj('Tercihler kaydedilemedi. Lütfen tekrar deneyin.');
    }
  }

  function sifirla() {
    setTercihler(VARSAYILAN_TERCIHLER);
    setMesaj('Tercihler varsayılana döndürüldü. Kaydetmeyi unutmayın.');
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-text-dim text-sm">
        Bildirim tercihleri yükleniyor...
      </div>
    );
  }

  return (
    <div>
      {/* Bildirim Turleri */}
      <SectionTitle sub="Hangi durumlarda bildirim almak istediginizi secin">
        Bildirim Turleri
      </SectionTitle>

      <div className="max-w-lg space-y-1">
        <Toggle
          checked={tercihler.durusma_hatirlatma}
          onChange={(v) => guncelle('durusma_hatirlatma', v)}
          label="Durusma hatirlatmalari"
          description="Yaklasan durusmalar icin bildirim gonder"
        />
        <Toggle
          checked={tercihler.sure_uyari}
          onChange={(v) => guncelle('sure_uyari', v)}
          label="Hukuki sure uyarilari"
          description="Itiraz ve dava sureleri dolmadan bildirim gonder"
        />
        <Toggle
          checked={tercihler.gorev_atama}
          onChange={(v) => guncelle('gorev_atama', v)}
          label="Gorev atama bildirimleri"
          description="Size yeni gorev atandiginda bildirim gonder"
        />
        <Toggle
          checked={tercihler.gorev_yaklasan}
          onChange={(v) => guncelle('gorev_yaklasan', v)}
          label="Gorev son tarih uyarilari"
          description="Gorev son tarihi yaklastiginda bildirim gonder"
        />
        <Toggle
          checked={tercihler.onay_talebi}
          onChange={(v) => guncelle('onay_talebi', v)}
          label="Onay talebi bildirimleri"
          description="Onay bekleyen islemler icin bildirim gonder"
        />
        <Toggle
          checked={tercihler.finans_uyari}
          onChange={(v) => guncelle('finans_uyari', v)}
          label="Finansal uyarilar"
          description="Geciken odemeler ve butce asimlari icin bildirim gonder"
        />
      </div>

      <Separator />

      {/* Kanallar */}
      <SectionTitle sub="Bildirimlerin hangi kanallardan gonderilecegini secin">
        Bildirim Kanallari
      </SectionTitle>

      <div className="max-w-lg space-y-1">
        <Toggle
          checked={tercihler.uygulama_ici}
          onChange={(v) => guncelle('uygulama_ici', v)}
          label="Uygulama ici bildirimler"
          description="Bildirimleri ust bardaki zon ikonunda goster"
        />
        <Toggle
          checked={tercihler.eposta}
          onChange={(v) => guncelle('eposta', v)}
          label="E-posta bildirimleri"
          description="Onemli bildirimler icin e-posta gonder"
        />
      </div>

      <Separator />

      {/* Hatirlatma Sureleri */}
      <SectionTitle sub="Bildirimlerin ne kadar onceden gonderilecegini ayarlayin">
        Hatirlatma Sureleri
      </SectionTitle>

      <div className="max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-muted flex-1">Durusma hatirlatma gun sayisi</label>
          <input
            type="number"
            min={1}
            max={30}
            value={tercihler.durusma_gun_once}
            onChange={(e) => guncelle('durusma_gun_once', Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="w-20 px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text text-center focus:outline-none focus:border-gold"
          />
          <span className="text-[11px] text-text-dim">gun once</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-text-muted flex-1">Sure uyari gun sayisi</label>
          <input
            type="number"
            min={1}
            max={30}
            value={tercihler.sure_gun_once}
            onChange={(e) => guncelle('sure_gun_once', Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            className="w-20 px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text text-center focus:outline-none focus:border-gold"
          />
          <span className="text-[11px] text-text-dim">gun once</span>
        </div>
      </div>

      <Separator />

      {/* Sessiz Saatler */}
      <SectionTitle sub="Bu saatler arasinda bildirim gonderilmez">
        Sessiz Saatler
      </SectionTitle>

      <div className="max-w-md flex items-center gap-3">
        <input
          type="time"
          value={tercihler.sessiz_baslangic}
          onChange={(e) => guncelle('sessiz_baslangic', e.target.value)}
          className="px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        />
        <span className="text-xs text-text-dim">—</span>
        <input
          type="time"
          value={tercihler.sessiz_bitis}
          onChange={(e) => guncelle('sessiz_bitis', e.target.value)}
          className="px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        />
      </div>

      <Separator />

      <div className="flex gap-3 max-w-md">
        <StatusMessage mesaj={mesaj} />
      </div>
      <div className="flex gap-3 mt-3">
        <SaveButton onClick={kaydet} disabled={kaydetMut.isPending} label="Tercihleri Kaydet" />
        <button
          onClick={sifirla}
          className="px-4 py-2 text-text-muted border border-border rounded-lg text-xs hover:bg-surface2 transition-colors"
        >
          Varsayilana Don
        </button>
      </div>
    </div>
  );
}
