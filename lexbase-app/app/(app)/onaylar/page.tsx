'use client';

import { useState, useMemo, useEffect } from 'react';
import { useOnayTalepleri, useOnayIslem, useOnayAyarlari, useOnayAyarlariGuncelle, ISLEM_ETIKETLERI, type OnayTalebi } from '@/lib/hooks/useOnay';
import { useYetki } from '@/lib/hooks/useRol';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Onaylar Sayfası — Maker/Checker Onay Mekanizması
   Yönetici/Sahip: Tüm talepleri görür, onaylar/reddeder
   Diğer roller: Kendi taleplerini görür
   ══════════════════════════════════════════════════════════════ */

type Sekme = 'beklemede' | 'onaylandi' | 'reddedildi' | 'ayarlar';

const SEKME_LABELS: Record<Sekme, { label: string; icon: string }> = {
  beklemede: { label: 'Bekleyen', icon: '⏳' },
  onaylandi: { label: 'Onaylanan', icon: '✅' },
  reddedildi: { label: 'Reddedilen', icon: '❌' },
  ayarlar: { label: 'Ayarlar', icon: '⚙️' },
};

export default function OnaylarPage() {
  useEffect(() => { document.title = 'Onaylar | LexBase'; }, []);

  const { yetkili } = useYetki('kullanici:yonet');
  const [sekme, setSekme] = useState<Sekme>('beklemede');
  const [authId, setAuthId] = useState<string | null>(null);

  // Mevcut kullanıcının auth_id'sini al
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setAuthId(user.id);
    });
  }, []);

  const { data: bekleyenler } = useOnayTalepleri({ durum: 'beklemede' });
  const { data: onaylananlar } = useOnayTalepleri({ durum: 'onaylandi' });
  const { data: reddedilenler } = useOnayTalepleri({ durum: 'reddedildi' });

  // Yönetici değilse sadece kendi taleplerini göster
  const filtrele = (liste: OnayTalebi[] | undefined) => {
    if (!liste) return [];
    if (yetkili) return liste;
    if (!authId) return [];
    return liste.filter((t) => t.talep_eden_auth_id === authId);
  };

  const filtreliBekleyenler = filtrele(bekleyenler);
  const filtreliOnaylananlar = filtrele(onaylananlar);
  const filtreliReddedilenler = filtrele(reddedilenler);

  const sekmeSayilari: Record<string, number> = {
    beklemede: filtreliBekleyenler.length,
    onaylandi: filtreliOnaylananlar.length,
    reddedildi: filtreliReddedilenler.length,
  };

  const aktifListe = sekme === 'beklemede' ? filtreliBekleyenler
    : sekme === 'onaylandi' ? filtreliOnaylananlar
    : sekme === 'reddedildi' ? filtreliReddedilenler
    : [];

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Onaylar
          {(sekmeSayilari.beklemede > 0) && (
            <span className="ml-2 text-sm font-normal bg-red text-white px-2 py-0.5 rounded-full">
              {sekmeSayilari.beklemede} bekleyen
            </span>
          )}
        </h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Bekleyen</div>
          <div className="font-[var(--font-playfair)] text-xl font-bold text-gold">{sekmeSayilari.beklemede}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Onaylanan</div>
          <div className="font-[var(--font-playfair)] text-xl font-bold text-green">{sekmeSayilari.onaylandi}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Reddedilen</div>
          <div className="font-[var(--font-playfair)] text-xl font-bold text-red">{sekmeSayilari.reddedildi}</div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 mb-4 bg-surface border border-border rounded-lg p-1">
        {(Object.entries(SEKME_LABELS) as [Sekme, { label: string; icon: string }][])
          .filter(([key]) => key !== 'ayarlar' || yetkili)
          .map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSekme(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              sekme === key
                ? 'bg-gold-dim text-gold shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            <span>{val.icon}</span>
            <span>{val.label}</span>
            {key !== 'ayarlar' && sekmeSayilari[key] > 0 && (
              <span className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1 ${
                key === 'beklemede' ? 'bg-red text-white' : 'bg-surface2 text-text-muted'
              }`}>
                {sekmeSayilari[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* İçerik */}
      {sekme === 'ayarlar' ? (
        <OnayAyarlariPanel />
      ) : (
        <OnayListesi
          talepler={aktifListe || []}
          sekme={sekme}
          yonetici={yetkili}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Onay Listesi
   ══════════════════════════════════════════════════════════════ */
function OnayListesi({ talepler, sekme, yonetici }: { talepler: OnayTalebi[]; sekme: string; yonetici: boolean }) {
  const onayIslem = useOnayIslem();
  const [redModalId, setRedModalId] = useState<string | null>(null);
  const [redNedeni, setRedNedeni] = useState('');

  async function handleOnayla(id: string) {
    await onayIslem.mutateAsync({ id, karar: 'onaylandi' });
  }

  async function handleReddet(id: string) {
    await onayIslem.mutateAsync({ id, karar: 'reddedildi', redNedeni: redNedeni || undefined });
    setRedModalId(null);
    setRedNedeni('');
  }

  if (talepler.length === 0) {
    return (
      <div className="text-center py-16 bg-surface border border-border rounded-lg flex-1">
        <div className="text-4xl mb-3">
          {sekme === 'beklemede' ? '🎉' : sekme === 'onaylandi' ? '✅' : '📭'}
        </div>
        <div className="text-sm text-text-muted">
          {sekme === 'beklemede' ? 'Bekleyen onay talebi yok' : sekme === 'onaylandi' ? 'Henüz onaylanan işlem yok' : 'Reddedilen işlem yok'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 flex-1">
      {talepler.map((t) => {
        const islemInfo = ISLEM_ETIKETLERI[t.islem_tipi] || { label: t.islem_tipi, icon: '📝', renk: 'text-text-muted' };

        return (
          <div
            key={t.id}
            className="bg-surface border border-border rounded-lg p-4 hover:border-gold/20 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center text-lg flex-shrink-0">
                {islemInfo.icon}
              </div>

              {/* İçerik */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-semibold ${islemInfo.renk}`}>{islemInfo.label}</span>
                  <span className="text-[10px] text-text-dim bg-surface2 px-1.5 py-0.5 rounded">
                    {t.modul}
                  </span>
                </div>

                {t.aciklama && (
                  <p className="text-xs text-text mb-1">{t.aciklama}</p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-text-dim">
                  <span>👤 {t.talep_eden_ad || 'Bilinmeyen'}</span>
                  <span>📅 {new Date(t.talep_tarihi).toLocaleDateString('tr-TR')}</span>
                  {t.tutar && (
                    <span className="font-semibold text-text">
                      {t.tutar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  )}
                </div>

                {/* Red nedeni göster */}
                {t.durum === 'reddedildi' && t.red_nedeni && (
                  <div className="mt-2 bg-red-dim border border-red/20 rounded px-2 py-1.5 text-[11px] text-red">
                    Red nedeni: {t.red_nedeni}
                  </div>
                )}

                {/* Onay bilgisi göster */}
                {t.durum === 'onaylandi' && t.onay_tarihi && (
                  <div className="mt-1 text-[10px] text-green">
                    Onaylandı: {new Date(t.onay_tarihi).toLocaleDateString('tr-TR')}
                  </div>
                )}
              </div>

              {/* Aksiyonlar — sadece beklemede ve yöneticiler */}
              {sekme === 'beklemede' && yonetici && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleOnayla(t.id)}
                    disabled={onayIslem.isPending}
                    className="px-3 py-1.5 bg-green text-white text-[11px] font-semibold rounded-lg hover:bg-green/80 transition-colors disabled:opacity-50"
                  >
                    Onayla
                  </button>
                  <button
                    onClick={() => setRedModalId(t.id)}
                    disabled={onayIslem.isPending}
                    className="px-3 py-1.5 bg-red text-white text-[11px] font-semibold rounded-lg hover:bg-red/80 transition-colors disabled:opacity-50"
                  >
                    Reddet
                  </button>
                </div>
              )}
            </div>

            {/* Red nedeni girişi */}
            {redModalId === t.id && (
              <div className="mt-3 pt-3 border-t border-border">
                <label className="text-[11px] text-text-muted block mb-1">Red nedeni (opsiyonel)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={redNedeni}
                    onChange={(e) => setRedNedeni(e.target.value)}
                    placeholder="Neden reddedildi?"
                    className="flex-1 px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-red"
                    autoFocus
                  />
                  <button
                    onClick={() => handleReddet(t.id)}
                    disabled={onayIslem.isPending}
                    className="px-3 py-1.5 bg-red text-white text-[11px] font-semibold rounded-lg hover:bg-red/80 transition-colors"
                  >
                    {onayIslem.isPending ? '...' : 'Reddet'}
                  </button>
                  <button
                    onClick={() => { setRedModalId(null); setRedNedeni(''); }}
                    className="px-3 py-1.5 border border-border text-text-muted text-[11px] rounded-lg hover:bg-surface2 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Onay Ayarları Paneli
   ══════════════════════════════════════════════════════════════ */
function OnayAyarlariPanel() {
  const { data: ayarlar, isLoading } = useOnayAyarlari();
  const guncelle = useOnayAyarlariGuncelle();
  const [mesaj, setMesaj] = useState('');

  async function handleToggle(key: string, value: boolean) {
    await guncelle.mutateAsync({ [key]: value } as Record<string, unknown>);
    setMesaj('Ayarlar güncellendi');
    setTimeout(() => setMesaj(''), 2000);
  }

  async function handleEsikGuncelle(value: string) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    await guncelle.mutateAsync({ masraf_onay_esik: num });
    setMesaj('Eşik güncellendi');
    setTimeout(() => setMesaj(''), 2000);
  }

  if (isLoading || !ayarlar) {
    return <div className="text-center py-8 text-text-muted text-sm">Yükleniyor...</div>;
  }

  const toggleItems: { key: string; label: string; desc: string; icon: string }[] = [
    { key: 'masraf_onay_aktif', label: 'Masraf Onayı', desc: 'Avukatların girdiği masraflar yönetici onayı bekler', icon: '💸' },
    { key: 'tahsilat_onay_aktif', label: 'Tahsilat Onayı', desc: 'Tahsilat kayıtları yönetici onayı bekler', icon: '💰' },
    { key: 'buro_gideri_onay_aktif', label: 'Büro Gideri Onayı', desc: 'Büro giderleri onay gerektirir', icon: '🏢' },
    { key: 'fatura_onay_aktif', label: 'Fatura Onayı', desc: 'Fatura oluşturma onay gerektirir', icon: '🧾' },
    { key: 'dava_acma_onay_aktif', label: 'Dava Açma Onayı', desc: 'Yeni dava açma onay gerektirir', icon: '📁' },
    { key: 'dosya_kapatma_onay_aktif', label: 'Dosya Kapatma Onayı', desc: 'Dosya kapatma/arşivleme onay gerektirir', icon: '📦' },
  ];

  const rolItems: { key: string; label: string; desc: string }[] = [
    { key: 'sahip_onaysiz', label: 'Büro Sahibi onaysız işlem yapabilir', desc: 'Sahip rolündeki kişiler tüm işlemleri onaysız yapabilir' },
    { key: 'yonetici_onaysiz', label: 'Yönetici onaysız işlem yapabilir', desc: 'Yönetici rolündeki kişiler işlemleri onaysız yapabilir' },
  ];

  return (
    <div className="space-y-6">
      {mesaj && (
        <div className="bg-green-dim border border-green/20 rounded-lg px-3 py-2 text-xs text-green">
          {mesaj}
        </div>
      )}

      {/* Onay gerektiren işlemler */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Onay Gerektiren İşlemler</h3>
        <div className="space-y-2">
          {toggleItems.map((item) => (
            <div key={item.key} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-xs font-medium text-text">{item.label}</div>
                  <div className="text-[10px] text-text-dim">{item.desc}</div>
                </div>
              </div>
              <button
                onClick={() => handleToggle(item.key, !(ayarlar as unknown as Record<string, boolean>)[item.key])}
                disabled={guncelle.isPending}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  (ayarlar as unknown as Record<string, boolean>)[item.key] ? 'bg-gold' : 'bg-border'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  (ayarlar as unknown as Record<string, boolean>)[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Masraf eşiği */}
      {ayarlar.masraf_onay_aktif && (
        <div className="bg-surface border border-border rounded-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-text">Masraf Onay Eşiği</div>
              <div className="text-[10px] text-text-dim">Bu tutarın altındaki masraflar otomatik onaylanır</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={ayarlar.masraf_onay_esik}
                onBlur={(e) => handleEsikGuncelle(e.target.value)}
                className="w-28 px-3 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text text-right focus:outline-none focus:border-gold"
              />
              <span className="text-[11px] text-text-dim">TL</span>
            </div>
          </div>
        </div>
      )}

      {/* Rol bazlı muafiyet */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Rol Muafiyetleri</h3>
        <div className="space-y-2">
          {rolItems.map((item) => (
            <div key={item.key} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-text">{item.label}</div>
                <div className="text-[10px] text-text-dim">{item.desc}</div>
              </div>
              <button
                onClick={() => handleToggle(item.key, !(ayarlar as unknown as Record<string, boolean>)[item.key])}
                disabled={guncelle.isPending}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  (ayarlar as unknown as Record<string, boolean>)[item.key] ? 'bg-gold' : 'bg-border'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  (ayarlar as unknown as Record<string, boolean>)[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bilgi */}
      <div className="bg-gold-dim border border-gold/20 rounded-lg px-4 py-3">
        <div className="text-xs text-gold font-medium mb-1">Nasıl çalışır?</div>
        <ul className="text-[11px] text-text-muted space-y-1">
          <li>1. Avukat/stajyer/sekreter bir işlem yapar (masraf, tahsilat vb.)</li>
          <li>2. İşlem &quot;Beklemede&quot; durumunda kaydedilir, finansa yansımaz</li>
          <li>3. Yönetici/Sahip bildirim alır ve Onaylar sayfasından inceler</li>
          <li>4. Onaylanırsa sisteme kaydedilir, reddedilirse talep edene bildirilir</li>
          <li>5. Eşik altı masraflar otomatik onaylanır (ayarlanabilir)</li>
        </ul>
      </div>
    </div>
  );
}
