'use client';

import { useState, useEffect } from 'react';
import { SectionTitle, Toggle, Separator, StatusMessage, SaveButton } from './shared';

/* ══════════════════════════════════════════════════════════════
   Bildirimler Tab — E-posta ve uygulama içi bildirim tercihleri
   ══════════════════════════════════════════════════════════════ */

interface BildirimTercihleri {
  // E-posta bildirimleri
  emailDurusma: boolean;
  emailGorevSonGun: boolean;
  emailSureBitimi: boolean;
  emailFinansUyari: boolean;
  emailHaftalikOzet: boolean;
  // Uygulama içi bildirimler
  appDurusma: boolean;
  appGorevSonGun: boolean;
  appSureBitimi: boolean;
  appFinansUyari: boolean;
  appYeniKayit: boolean;
  // Hatırlatma süreleri
  durusmaHatirlatmaDk: number;
  gorevHatirlatmaGun: number;
  sureHatirlatmaGun: number;
}

const VARSAYILAN: BildirimTercihleri = {
  emailDurusma: true,
  emailGorevSonGun: true,
  emailSureBitimi: true,
  emailFinansUyari: false,
  emailHaftalikOzet: true,
  appDurusma: true,
  appGorevSonGun: true,
  appSureBitimi: true,
  appFinansUyari: true,
  appYeniKayit: false,
  durusmaHatirlatmaDk: 60,
  gorevHatirlatmaGun: 1,
  sureHatirlatmaGun: 3,
};

const LS_KEY = 'lb_bildirim_tercihleri';

export function BildirimlerTab() {
  const [tercihler, setTercihler] = useState<BildirimTercihleri>(VARSAYILAN);
  const [mesaj, setMesaj] = useState('');

  useEffect(() => {
    try {
      const kayitli = localStorage.getItem(LS_KEY);
      if (kayitli) {
        setTercihler({ ...VARSAYILAN, ...JSON.parse(kayitli) });
      }
    } catch {
      // bozuk veri — varsayılan kullan
    }
  }, []);

  function guncelle<K extends keyof BildirimTercihleri>(key: K, val: BildirimTercihleri[K]) {
    setTercihler((prev) => ({ ...prev, [key]: val }));
  }

  function kaydet() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(tercihler));
      setMesaj('Bildirim tercihleri kaydedildi.');
    } catch {
      setMesaj('Tercihler kaydedilemedi.');
    }
  }

  function sifirla() {
    setTercihler(VARSAYILAN);
    localStorage.removeItem(LS_KEY);
    setMesaj('Tercihler varsayılana döndürüldü.');
  }

  return (
    <div>
      {/* E-posta Bildirimleri */}
      <SectionTitle sub="Hangi durumlarda e-posta almak istediğinizi seçin">
        E-posta Bildirimleri
      </SectionTitle>

      <div className="max-w-lg space-y-1">
        <Toggle
          checked={tercihler.emailDurusma}
          onChange={(v) => guncelle('emailDurusma', v)}
          label="Duruşma hatırlatmaları"
          description="Yaklaşan duruşmalar için e-posta bildirimi gönder"
        />
        <Toggle
          checked={tercihler.emailGorevSonGun}
          onChange={(v) => guncelle('emailGorevSonGun', v)}
          label="Görev son tarih uyarıları"
          description="Görev son tarihi yaklaştığında e-posta gönder"
        />
        <Toggle
          checked={tercihler.emailSureBitimi}
          onChange={(v) => guncelle('emailSureBitimi', v)}
          label="Hukuki süre bitimi uyarıları"
          description="İtiraz ve dava süreleri dolmadan e-posta gönder"
        />
        <Toggle
          checked={tercihler.emailFinansUyari}
          onChange={(v) => guncelle('emailFinansUyari', v)}
          label="Finansal uyarılar"
          description="Geciken ödemeler ve bütçe aşımları için e-posta gönder"
        />
        <Toggle
          checked={tercihler.emailHaftalikOzet}
          onChange={(v) => guncelle('emailHaftalikOzet', v)}
          label="Haftalık özet rapor"
          description="Her Pazartesi haftalık özet rapor gönder"
        />
      </div>

      <Separator />

      {/* Uygulama İçi Bildirimler */}
      <SectionTitle sub="Uygulama içinde gösterilecek bildirimleri seçin">
        Uygulama İçi Bildirimler
      </SectionTitle>

      <div className="max-w-lg space-y-1">
        <Toggle
          checked={tercihler.appDurusma}
          onChange={(v) => guncelle('appDurusma', v)}
          label="Duruşma bildirimleri"
          description="Dashboard'da duruşma uyarıları göster"
        />
        <Toggle
          checked={tercihler.appGorevSonGun}
          onChange={(v) => guncelle('appGorevSonGun', v)}
          label="Görev son tarih bildirimleri"
          description="Yaklaşan görev son tarihleri göster"
        />
        <Toggle
          checked={tercihler.appSureBitimi}
          onChange={(v) => guncelle('appSureBitimi', v)}
          label="Hukuki süre bildirimleri"
          description="Kritik sürelerin yaklaştığını göster"
        />
        <Toggle
          checked={tercihler.appFinansUyari}
          onChange={(v) => guncelle('appFinansUyari', v)}
          label="Finansal uyarı bildirimleri"
          description="Finansal uyarıları sidebar'da göster"
        />
        <Toggle
          checked={tercihler.appYeniKayit}
          onChange={(v) => guncelle('appYeniKayit', v)}
          label="Yeni kayıt bildirimleri"
          description="Ekip üyelerinin eklediği kayıtları göster"
        />
      </div>

      <Separator />

      {/* Hatırlatma Süreleri */}
      <SectionTitle sub="Bildirimlerin ne kadar önceden gönderileceğini ayarlayın">
        Hatırlatma Süreleri
      </SectionTitle>

      <div className="max-w-md space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-text-muted flex-1">Duruşma hatırlatması</label>
          <select
            value={tercihler.durusmaHatirlatmaDk}
            onChange={(e) => guncelle('durusmaHatirlatmaDk', Number(e.target.value))}
            className="px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          >
            <option value={15}>15 dakika önce</option>
            <option value={30}>30 dakika önce</option>
            <option value={60}>1 saat önce</option>
            <option value={120}>2 saat önce</option>
            <option value={1440}>1 gün önce</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-text-muted flex-1">Görev son tarih uyarısı</label>
          <select
            value={tercihler.gorevHatirlatmaGun}
            onChange={(e) => guncelle('gorevHatirlatmaGun', Number(e.target.value))}
            className="px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          >
            <option value={0}>Aynı gün</option>
            <option value={1}>1 gün önce</option>
            <option value={2}>2 gün önce</option>
            <option value={3}>3 gün önce</option>
            <option value={7}>1 hafta önce</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-text-muted flex-1">Hukuki süre uyarısı</label>
          <select
            value={tercihler.sureHatirlatmaGun}
            onChange={(e) => guncelle('sureHatirlatmaGun', Number(e.target.value))}
            className="px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          >
            <option value={1}>1 gün önce</option>
            <option value={3}>3 gün önce</option>
            <option value={5}>5 gün önce</option>
            <option value={7}>1 hafta önce</option>
            <option value={14}>2 hafta önce</option>
          </select>
        </div>
      </div>

      <Separator />

      <div className="flex gap-3 max-w-md">
        <StatusMessage mesaj={mesaj} />
      </div>
      <div className="flex gap-3 mt-3">
        <SaveButton onClick={kaydet} label="Tercihleri Kaydet" />
        <button
          onClick={sifirla}
          className="px-4 py-2 text-text-muted border border-border rounded-lg text-xs hover:bg-surface2 transition-colors"
        >
          Varsayılana Dön
        </button>
      </div>
    </div>
  );
}
