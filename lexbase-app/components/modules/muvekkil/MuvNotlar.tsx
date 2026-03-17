'use client';

import { useState, useMemo } from 'react';
import type { Muvekkil } from '@/lib/hooks/useMuvekkillar';

/* ── Not veri yapısı ── */
interface Not {
  id: string;
  tarih: string;
  icerik: string;
  baslik?: string;
  renk?: string;
}

const RENK_SECENEKLERI = [
  { key: 'sari', label: '🟡', bg: 'bg-amber-500/8 border-amber-500/25', tape: 'bg-amber-500/30', dot: 'bg-amber-400' },
  { key: 'mavi', label: '🔵', bg: 'bg-blue-400/8 border-blue-400/25', tape: 'bg-blue-400/30', dot: 'bg-blue-400' },
  { key: 'yesil', label: '🟢', bg: 'bg-emerald-400/8 border-emerald-400/25', tape: 'bg-emerald-400/30', dot: 'bg-emerald-400' },
  { key: 'mor', label: '🟣', bg: 'bg-purple-400/8 border-purple-400/25', tape: 'bg-purple-400/30', dot: 'bg-purple-400' },
  { key: 'kirmizi', label: '🔴', bg: 'bg-red/8 border-red/25', tape: 'bg-red/30', dot: 'bg-red' },
];

const MAX_SATIRLAR = 4; // Kısaltılmış gösterimde max satır
const MAX_KARAKTER = 200; // Kısaltılmış gösterimde max karakter

interface Props {
  muv: Muvekkil;
  onKaydet: (guncellenen: Muvekkil) => void;
}

export function MuvNotlar({ muv, onKaydet }: Props) {
  const [ekleOpen, setEkleOpen] = useState(false);
  const [yeniBaslik, setYeniBaslik] = useState('');
  const [yeniNot, setYeniNot] = useState('');
  const [yeniRenk, setYeniRenk] = useState('sari');
  const [acikNotId, setAcikNotId] = useState<string | null>(null);
  const [duzenleId, setDuzenleId] = useState<string | null>(null);
  const [duzenleBaslik, setDuzenleBaslik] = useState('');
  const [duzenleIcerik, setDuzenleIcerik] = useState('');
  const [aramaQ, setAramaQ] = useState('');

  /* ── Notları al (eski string + yeni array uyumluluğu) ── */
  const notlar: Not[] = useMemo(() => {
    const arr = (muv as Record<string, unknown>).notlar as Not[] | undefined;
    if (arr && Array.isArray(arr)) return arr;
    if (muv.not) {
      return [{ id: 'legacy', tarih: '', icerik: muv.not }];
    }
    return [];
  }, [muv]);

  /* ── Arama filtresi ── */
  const filtrelenmis = useMemo(() => {
    if (!aramaQ.trim()) return notlar;
    const q = aramaQ.toLocaleLowerCase('tr');
    return notlar.filter(
      (n) =>
        (n.baslik || '').toLocaleLowerCase('tr').includes(q) ||
        n.icerik.toLocaleLowerCase('tr').includes(q)
    );
  }, [notlar, aramaQ]);

  /* ── Renk helper ── */
  const getRenk = (key?: string) => RENK_SECENEKLERI.find((r) => r.key === key) || RENK_SECENEKLERI[0];

  /* ── Kısaltma helper ── */
  const kisalt = (text: string): { kisaltilmis: string; tamMi: boolean } => {
    const satirlar = text.split('\n');
    if (satirlar.length > MAX_SATIRLAR) {
      return { kisaltilmis: satirlar.slice(0, MAX_SATIRLAR).join('\n'), tamMi: false };
    }
    if (text.length > MAX_KARAKTER) {
      return { kisaltilmis: text.slice(0, MAX_KARAKTER), tamMi: false };
    }
    return { kisaltilmis: text, tamMi: true };
  };

  /* ── Kaydetme helpers ── */
  const kaydetNotlar = (guncel: Not[]) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { not: _eskiNot, ...rest } = muv as Record<string, unknown>;
    onKaydet({ ...rest, id: muv.id, ad: muv.ad, notlar: guncel } as Muvekkil);
  };

  /* ── Not ekle ── */
  const handleEkle = () => {
    if (!yeniNot.trim()) return;
    const yeni: Not = {
      id: crypto.randomUUID(),
      tarih: new Date().toISOString().slice(0, 16).replace('T', ' '),
      baslik: yeniBaslik.trim() || undefined,
      icerik: yeniNot.trim(),
      renk: yeniRenk,
    };
    kaydetNotlar([yeni, ...notlar.filter((n) => n.id !== 'legacy')]);
    setYeniBaslik('');
    setYeniNot('');
    setYeniRenk('sari');
    setEkleOpen(false);
  };

  /* ── Not düzenle ── */
  const handleDuzenleBaslat = (n: Not) => {
    setDuzenleId(n.id);
    setDuzenleBaslik(n.baslik || '');
    setDuzenleIcerik(n.icerik);
  };

  const handleDuzenleKaydet = () => {
    if (!duzenleId || !duzenleIcerik.trim()) return;
    const guncel = notlar.map((n) =>
      n.id === duzenleId ? { ...n, baslik: duzenleBaslik.trim() || undefined, icerik: duzenleIcerik.trim() } : n
    );
    kaydetNotlar(guncel);
    setDuzenleId(null);
  };

  /* ── Not sil ── */
  const handleSil = (silId: string) => {
    kaydetNotlar(notlar.filter((n) => n.id !== silId));
    if (acikNotId === silId) setAcikNotId(null);
  };

  return (
    <div className="space-y-4">
      {/* Başlık + Arama + Ekle */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-text shrink-0">📝 Notlar ({notlar.length})</h3>

        {notlar.length > 3 && (
          <input
            type="text"
            value={aramaQ}
            onChange={(e) => setAramaQ(e.target.value)}
            placeholder="Notlarda ara..."
            className="flex-1 max-w-[200px] px-2.5 py-1 text-[11px] bg-surface border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
          />
        )}

        <button
          onClick={() => setEkleOpen(!ekleOpen)}
          className="text-xs font-medium text-gold hover:text-gold-light transition-colors shrink-0"
        >
          {ekleOpen ? '✕ İptal' : '+ Not Ekle'}
        </button>
      </div>

      {/* ── Not Ekleme Formu ── */}
      {ekleOpen && (
        <div className="bg-surface border border-gold/30 rounded-xl p-4 space-y-3">
          {/* Başlık + Renk seçici */}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              value={yeniBaslik}
              onChange={(e) => setYeniBaslik(e.target.value)}
              placeholder="Başlık (opsiyonel)"
              className="flex-1 px-3 py-2 text-sm font-semibold bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
              autoFocus
            />
            {/* Renk seçimi */}
            <div className="flex gap-1">
              {RENK_SECENEKLERI.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setYeniRenk(r.key)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    yeniRenk === r.key ? 'ring-2 ring-gold ring-offset-1 ring-offset-bg scale-110' : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* İçerik */}
          <textarea
            value={yeniNot}
            onChange={(e) => setYeniNot(e.target.value)}
            placeholder="Notunuzu yazın..."
            rows={4}
            className="w-full px-3 py-2 text-sm bg-bg border border-border rounded-lg text-text placeholder:text-text-dim focus:border-gold focus:outline-none resize-none"
          />

          {/* Butonlar */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-text-dim">
              {yeniNot.length > 0 && `${yeniNot.length} karakter`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { setEkleOpen(false); setYeniNot(''); setYeniBaslik(''); }}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleEkle}
                disabled={!yeniNot.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Not Listesi ── */}
      {filtrelenmis.length === 0 && notlar.length === 0 ? (
        <div className="text-center py-10 text-text-muted bg-surface border border-border rounded-lg">
          <div className="text-4xl mb-3">📝</div>
          <div className="text-sm font-medium">Henüz not eklenmemiş</div>
          <button
            onClick={() => setEkleOpen(true)}
            className="mt-3 px-4 py-1.5 text-xs font-medium text-gold border border-gold/30 rounded-lg hover:bg-gold-dim transition-colors"
          >
            + İlk Notu Ekle
          </button>
        </div>
      ) : filtrelenmis.length === 0 ? (
        <div className="text-center py-6 text-text-dim text-xs">Arama sonucu bulunamadı</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtrelenmis.map((n) => {
            const renk = getRenk(n.renk);
            const isAcik = acikNotId === n.id;
            const isDuzenle = duzenleId === n.id;
            const { kisaltilmis, tamMi } = kisalt(n.icerik);

            return (
              <div
                key={n.id}
                className={`border rounded-xl relative group transition-all hover:shadow-md ${renk.bg}`}
              >
                {/* Bant şeridi */}
                <div className={`absolute top-0 left-5 w-8 h-1.5 ${renk.tape} rounded-b-sm`} />

                <div className="p-4 pt-3">
                  {/* Üst satır: Başlık + Tarih + Aksiyon */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${renk.dot}`} />
                      {n.baslik ? (
                        <span className="text-sm font-bold text-text truncate">{n.baslik}</span>
                      ) : (
                        <span className="text-[11px] text-text-dim italic truncate">Başlıksız not</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {n.tarih && (
                        <span className="text-[9px] text-text-dim font-mono bg-bg/60 px-1.5 py-0.5 rounded">
                          {n.tarih}
                        </span>
                      )}
                      {/* Düzenle + Sil */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDuzenleBaslat(n)}
                          className="text-text-dim hover:text-gold text-[10px] p-0.5"
                          title="Düzenle"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleSil(n.id)}
                          className="text-text-dim hover:text-red text-[10px] p-0.5"
                          title="Sil"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* İçerik — Düzenleme modu */}
                  {isDuzenle ? (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        value={duzenleBaslik}
                        onChange={(e) => setDuzenleBaslik(e.target.value)}
                        placeholder="Başlık (opsiyonel)"
                        className="w-full px-2 py-1 text-xs font-semibold bg-bg border border-border rounded text-text placeholder:text-text-dim focus:border-gold focus:outline-none"
                        autoFocus
                      />
                      <textarea
                        value={duzenleIcerik}
                        onChange={(e) => setDuzenleIcerik(e.target.value)}
                        rows={4}
                        className="w-full px-2 py-1 text-xs bg-bg border border-border rounded text-text focus:border-gold focus:outline-none resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setDuzenleId(null)}
                          className="px-2 py-1 text-[11px] text-text-dim hover:text-text"
                        >
                          Vazgeç
                        </button>
                        <button
                          onClick={handleDuzenleKaydet}
                          className="px-3 py-1 text-[11px] font-semibold bg-gold text-bg rounded hover:bg-gold-light"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* İçerik — Kısaltılmış veya tam */}
                      <div className="text-[13px] text-text whitespace-pre-wrap leading-relaxed">
                        {isAcik ? n.icerik : kisaltilmis}
                        {!tamMi && !isAcik && (
                          <span className="text-text-dim">…</span>
                        )}
                      </div>

                      {/* Devamını oku / Kısalt */}
                      {!tamMi && (
                        <button
                          onClick={() => setAcikNotId(isAcik ? null : n.id)}
                          className="text-[11px] text-gold hover:text-gold-light font-medium mt-1.5 transition-colors"
                        >
                          {isAcik ? '▲ Kısalt' : '▼ Devamını oku'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
