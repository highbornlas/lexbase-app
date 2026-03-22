'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useKarsiTaraflar, type KarsiTaraf } from '@/lib/hooks/useKarsiTaraflar';
import { useVekillar, type Vekil } from '@/lib/hooks/useVekillar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { usePersoneller } from '@/lib/hooks/usePersonel';
import { KarsiTarafModal } from '@/components/modules/KarsiTarafModal';
import { VekilModal } from '@/components/modules/VekilModal';
import { MuvekkilModal } from '@/components/modules/MuvekkilModal';

/* ══════════════════════════════════════════════════════════════
   CokluRehberSecici — Çoklu Kişi Seçici
   Banka widget paterni ile birden fazla kişi ekleme/çıkarma
   ══════════════════════════════════════════════════════════════ */

export interface SeciliKisi {
  id: string;   // rehber kaydının ID'si (veya '' ise serbest metin)
  ad: string;   // görünen ad
  vekiller?: SeciliKisi[];  // bu kişinin vekilleri (UYAP gibi kişi bazlı vekil atama)
}

interface CokluRehberSeciciProps {
  tip: 'karsiTaraf' | 'avukat' | 'muvekkil';
  /** Seçili kişi listesi */
  value: SeciliKisi[];
  /** Değişiklik callback'i */
  onChange: (value: SeciliKisi[]) => void;
  /** Başlık etiketi */
  label?: string;
  /** Ekleme butonu metni */
  ekleMetni?: string;
  /** Her kişiye ayrı vekil atanabilsin mi (UYAP gibi) */
  vekilEklenebilir?: boolean;
}

interface SecenekItem {
  id: string;
  ad: string;
  meta?: string;
  badge?: string;
  badgeClass?: string;
}

export function CokluRehberSecici({
  tip,
  value,
  onChange,
  label,
  ekleMetni,
  vekilEklenebilir,
}: CokluRehberSeciciProps) {
  const varsayilanLabel = tip === 'karsiTaraf' ? 'Karşı Taraflar' : tip === 'avukat' ? 'Avukatlar' : 'Müvekkiller';
  const varsayilanEkleMetni = tip === 'karsiTaraf' ? 'Karşı Taraf Ekle' : tip === 'avukat' ? 'Avukat Ekle' : 'Müvekkil Ekle';
  const [vekilAcikIdx, setVekilAcikIdx] = useState<number | null>(null);

  function handleEkle(kisi: SeciliKisi) {
    // Zaten ekliyse ekleme
    if (value.some((v) => v.id && v.id === kisi.id)) return;
    onChange([...value, kisi]);
  }

  function handleKaldir(index: number) {
    onChange(value.filter((_, i) => i !== index));
    if (vekilAcikIdx === index) setVekilAcikIdx(null);
  }

  function handleVekilEkle(kisiIdx: number, vekil: SeciliKisi) {
    const yeni = [...value];
    const kisi = { ...yeni[kisiIdx] };
    if (!kisi.vekiller) kisi.vekiller = [];
    if (kisi.vekiller.some((v) => v.id && v.id === vekil.id)) return;
    kisi.vekiller = [...kisi.vekiller, vekil];
    yeni[kisiIdx] = kisi;
    onChange(yeni);
  }

  function handleVekilKaldir(kisiIdx: number, vekilIdx: number) {
    const yeni = [...value];
    const kisi = { ...yeni[kisiIdx] };
    kisi.vekiller = (kisi.vekiller || []).filter((_, i) => i !== vekilIdx);
    yeni[kisiIdx] = kisi;
    onChange(yeni);
  }

  return (
    <div className="border-t border-border/50 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          {label || varsayilanLabel}
          {value.length > 0 && (
            <span className="ml-1.5 text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
              {value.length}
            </span>
          )}
        </div>
      </div>

      {/* Seçili kişi listesi */}
      {value.length === 0 ? (
        <div className="text-center py-3 text-text-dim text-xs bg-surface2/50 rounded-lg border border-border/30">
          Henüz kimse eklenmemiş
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {value.map((kisi, idx) => (
            <div key={`${kisi.id || kisi.ad}-${idx}`}>
              <div className="flex items-center gap-2 bg-surface2/50 rounded-lg border border-border/50 px-3 py-2 group">
                <span className="text-xs text-text-dim w-5 text-center flex-shrink-0">
                  {idx + 1}.
                </span>
                <span className="text-sm font-medium text-text flex-1 truncate">{kisi.ad}</span>
                {kisi.id && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-gold/10 text-gold flex-shrink-0">
                    REHBER
                  </span>
                )}
                {vekilEklenebilir && (
                  <button
                    type="button"
                    onClick={() => setVekilAcikIdx(vekilAcikIdx === idx ? null : idx)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all flex-shrink-0 ${
                      vekilAcikIdx === idx
                        ? 'bg-gold/20 text-gold border-gold/30'
                        : 'text-text-muted border-border/50 hover:border-gold/30 hover:text-gold'
                    }`}
                    title="Vekil ekle/düzenle"
                  >
                    Vekil {kisi.vekiller?.length ? `(${kisi.vekiller.length})` : '+'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleKaldir(idx)}
                  className="w-6 h-6 flex items-center justify-center rounded-md
                             text-text-dim hover:text-red hover:bg-red-dim transition-all text-xs
                             opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Kaldır"
                >
                  ✕
                </button>
              </div>
              {/* Kişiye ait vekiller */}
              {vekilEklenebilir && kisi.vekiller && kisi.vekiller.length > 0 && (
                <div className="ml-8 mt-1 space-y-1">
                  {kisi.vekiller.map((v, vi) => (
                    <div
                      key={`v-${v.id || v.ad}-${vi}`}
                      className="flex items-center gap-2 bg-surface2/30 rounded-md border border-border/30 px-2.5 py-1.5 group/vekil"
                    >
                      <span className="text-[10px] text-text-dim flex-shrink-0">Vekil:</span>
                      <span className="text-xs font-medium text-text flex-1 truncate">{v.ad}</span>
                      <button
                        type="button"
                        onClick={() => handleVekilKaldir(idx, vi)}
                        className="w-5 h-5 flex items-center justify-center rounded text-text-dim
                                   hover:text-red hover:bg-red-dim transition-all text-[10px]
                                   opacity-0 group-hover/vekil:opacity-100 flex-shrink-0"
                        title="Vekili kaldır"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Inline vekil ekleme */}
              {vekilEklenebilir && vekilAcikIdx === idx && (
                <div className="ml-8 mt-1.5 space-y-1.5">
                  <BuroVekilHizliEkle
                    mevcutVekilIds={new Set((kisi.vekiller || []).filter((v) => v.id).map((v) => v.id))}
                    onEkle={(vekil) => handleVekilEkle(idx, vekil)}
                  />
                  <KisiAramaEkle
                    tip="avukat"
                    seciliIds={new Set((kisi.vekiller || []).filter((v) => v.id).map((v) => v.id))}
                    onSec={(vekil) => { handleVekilEkle(idx, vekil); }}
                    ekleMetni="Vekil Ekle"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Kişi arama ve ekleme */}
      <KisiAramaEkle
        tip={tip}
        seciliIds={new Set(value.filter((v) => v.id).map((v) => v.id))}
        onSec={handleEkle}
        ekleMetni={ekleMetni || varsayilanEkleMetni}
      />
    </div>
  );
}

/* ── Arama + Seçim Dropdown ── */
function KisiAramaEkle({
  tip,
  seciliIds,
  onSec,
  ekleMetni,
}: {
  tip: 'karsiTaraf' | 'avukat' | 'muvekkil';
  seciliIds: Set<string>;
  onSec: (kisi: SeciliKisi) => void;
  ekleMetni: string;
}) {
  const { data: karsiTaraflar } = useKarsiTaraflar();
  const { data: vekillar } = useVekillar();
  const { data: muvekkillar } = useMuvekkillar();
  const { data: personeller } = usePersoneller();

  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Listeyi oluştur ── */
  const secenekler = useMemo<SecenekItem[]>(() => {
    if (tip === 'karsiTaraf') {
      return (karsiTaraflar || []).map((kt) => ({
        id: kt.id,
        ad: [kt.ad, kt.soyad].filter(Boolean).join(' '),
        meta: [kt.tc && `TC: ${kt.tc}`, kt.vergiNo && `VKN: ${kt.vergiNo}`, kt.tel]
          .filter(Boolean)
          .join(' · '),
        badge: kt.tip === 'tuzel' ? 'TÜZEL' : 'GERÇEK',
        badgeClass: kt.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10' : 'text-green bg-green-dim',
      }));
    }
    if (tip === 'avukat') {
      // Büro personelindeki avukatlar (önce gösterilir)
      const buroAvukatlari: SecenekItem[] = (personeller || [])
        .filter((p) => (p.rol === 'avukat' || p.rol === 'yonetici' || p.rol === 'sahip') && p.durum === 'aktif')
        .map((p) => ({
          id: p.id,
          ad: p.ad || '',
          meta: [(p as Record<string,unknown>).baro && `${(p as Record<string,unknown>).baro} Barosu`, p.baroSicil && `Sicil: ${p.baroSicil}`, p.tel]
            .filter(Boolean)
            .join(' · '),
          badge: 'BÜRO',
          badgeClass: 'text-blue-400 bg-blue-400/10',
        }));
      // Dış avukatlar (vekillar tablosundan)
      const disAvukatlar: SecenekItem[] = (vekillar || []).map((v) => ({
        id: v.id,
        ad: [v.ad, v.soyad].filter(Boolean).join(' '),
        meta: [v.baro && `${v.baro} Barosu`, v.baroSicil && `Sicil: ${v.baroSicil}`, v.tel]
          .filter(Boolean)
          .join(' · '),
        badge: v.baro ? `${v.baro}` : undefined,
        badgeClass: 'text-gold bg-gold/10',
      }));
      return [...buroAvukatlari, ...disAvukatlar];
    }
    // muvekkil
    return (muvekkillar || []).map((m) => ({
      id: m.id,
      ad: [m.ad, m.soyad].filter(Boolean).join(' '),
      meta: [m.tc && `TC: ${m.tc}`, m.tel]
        .filter(Boolean)
        .join(' · '),
      badge: m.tip === 'tuzel' ? 'TÜZEL' : 'GERÇEK',
      badgeClass: m.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10' : 'text-green bg-green-dim',
    }));
  }, [tip, karsiTaraflar, vekillar, muvekkillar, personeller]);

  /* ── Filtreleme — arama yapılmadan listeleme yok ── */
  const filtrelenmis = useMemo(() => {
    if (!arama.trim()) return []; // Arama yapmadan sıralama olmasın
    const base = secenekler.filter((s) => !seciliIds.has(s.id)); // zaten seçilenleri çıkar
    const q = arama.toLocaleLowerCase('tr');
    return base.filter(
      (s) => s.ad.toLocaleLowerCase('tr').includes(q) || (s.meta || '').toLocaleLowerCase('tr').includes(q)
    );
  }, [secenekler, arama, seciliIds]);

  /* ── Dışarı tıklama ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAcik(false);
      }
    }
    if (acik) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [acik]);

  /* ── Seçim yapıldığında ── */
  function handleSecim(item: SecenekItem) {
    onSec({ id: item.id, ad: item.ad });
    setArama('');
    setAcik(false);
  }

  /* ── Serbest metin ile ekle ── */
  function handleSerbestEkle() {
    if (arama.trim()) {
      onSec({ id: '', ad: arama.trim() });
      setArama('');
      setAcik(false);
    }
  }

  /* ── Modal'dan oluşturulan kayıt ── */
  function handleCreated(kayit: KarsiTaraf | Vekil | { id: string; ad?: string; soyad?: string }) {
    const ad = 'soyad' in kayit && kayit.soyad
      ? `${kayit.ad} ${kayit.soyad}`
      : (kayit.ad || '');
    onSec({ id: kayit.id, ad });
    setModalOpen(false);
    setAcik(false);
  }

  const placeholder = tip === 'karsiTaraf'
    ? 'Karşı taraf ara veya yaz...'
    : tip === 'avukat'
    ? 'Avukat ara veya yaz...'
    : 'Müvekkil ara...';

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={arama}
            onChange={(e) => { setArama(e.target.value); setAcik(true); }}
            onFocus={() => setAcik(true)}
            placeholder={placeholder}
            className="flex-1 h-9 px-3 rounded-lg bg-surface2 border border-border text-xs text-text
              focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/50
              placeholder:text-text-dim"
          />
          <button
            type="button"
            onClick={() => { inputRef.current?.focus(); }}
            className="px-3 h-9 rounded-lg text-[11px] font-semibold text-gold border border-gold/30
                       hover:bg-gold-dim transition-colors flex items-center gap-1"
          >
            <span>+</span> {ekleMetni}
          </button>
        </div>

        {/* Dropdown */}
        {acik && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {/* Yönlendirme veya sonuçlar */}
            {!arama.trim() ? (
              <div className="px-3 py-3 text-xs text-text-muted text-center">
                Aramak istediğiniz kişinin adını yazın
              </div>
            ) : filtrelenmis.length > 0 ? (
              filtrelenmis.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSecim(item)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gold-dim transition-colors border-b border-border/30 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">{item.ad}</span>
                    {item.badge && (
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.meta && (
                    <div className="text-[10px] text-text-muted mt-0.5">{item.meta}</div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-text-muted text-center">
                Eşleşen kayıt bulunamadı
              </div>
            )}

            {/* Serbest metin ile ekle (müvekkil hariç) */}
            {tip !== 'muvekkil' && arama.trim() && !filtrelenmis.some((f) => f.ad.toLocaleLowerCase('tr') === arama.toLocaleLowerCase('tr')) && (
              <button
                type="button"
                onClick={handleSerbestEkle}
                className="w-full text-left px-3 py-2.5 text-text-muted hover:bg-surface2 transition-colors border-t border-border"
              >
                <span className="text-xs">📝 &quot;{arama}&quot; olarak ekle (serbest metin)</span>
              </button>
            )}

            {/* Yeni Ekle — Modal */}
            <button
              type="button"
              onClick={() => { setModalOpen(true); setAcik(false); }}
              className="w-full text-left px-3 py-2.5 text-gold hover:bg-gold-dim transition-colors border-t border-border flex items-center gap-2"
            >
              <span className="text-sm">➕</span>
              <span className="text-xs font-semibold">
                {tip === 'karsiTaraf' ? 'Yeni Karşı Taraf Oluştur' : tip === 'avukat' ? 'Yeni Avukat Oluştur' : 'Yeni Müvekkil Oluştur'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* İlgili Modal */}
      {tip === 'karsiTaraf' && (
        <KarsiTarafModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {tip === 'avukat' && (
        <VekilModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {tip === 'muvekkil' && (
        <MuvekkilModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={(m) => handleCreated(m)}
        />
      )}
    </>
  );
}

/* ── Büro Avukatlarını Hızlıca Vekil Olarak Ekle ── */
function BuroVekilHizliEkle({
  mevcutVekilIds,
  onEkle,
}: {
  mevcutVekilIds: Set<string>;
  onEkle: (vekil: SeciliKisi) => void;
}) {
  const { data: personeller } = usePersoneller();

  const buroAvukatlari = useMemo(() => {
    return (personeller || []).filter(
      (p) =>
        (p.rol === 'avukat' || p.rol === 'yonetici' || p.rol === 'sahip') &&
        p.durum === 'aktif' &&
        !mevcutVekilIds.has(p.id)
    );
  }, [personeller, mevcutVekilIds]);

  if (buroAvukatlari.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {buroAvukatlari.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onEkle({ id: p.id, ad: p.ad || '' })}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gold
                     bg-gold/5 border border-gold/20 rounded-md hover:bg-gold/15 transition-colors"
          title={`${p.ad} - Büro avukatı olarak vekil ekle`}
        >
          <span className="text-[10px]">+</span>
          {p.ad}
          <span className="text-[9px] text-text-dim ml-0.5">(Büro)</span>
        </button>
      ))}
    </div>
  );
}
