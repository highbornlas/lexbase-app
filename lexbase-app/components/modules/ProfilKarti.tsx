'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import type { KarsiTaraf } from '@/lib/hooks/useKarsiTaraflar';
import type { Vekil } from '@/lib/hooks/useVekillar';
import { EtiketBadge } from '@/components/ui/EtiketSecici';

/* ══════════════════════════════════════════════════════════════
   Profil Kartı — Karşı Taraf veya Avukat bilgi kartı
   Tıklanınca düzenle modal yerine bu kart açılır
   ══════════════════════════════════════════════════════════════ */

interface ProfilKartiProps {
  open: boolean;
  onClose: () => void;
  tip: 'karsiTaraf' | 'avukat';
  karsiTaraf?: KarsiTaraf | null;
  vekil?: Vekil | null;
  onDuzenle: () => void;
  onSil: () => void;
}

export function ProfilKarti({ open, onClose, tip, karsiTaraf, vekil, onDuzenle, onSil }: ProfilKartiProps) {
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();

  const kisi = tip === 'karsiTaraf' ? karsiTaraf : vekil;
  const id = kisi?.id || '';
  const ad = kisi ? [kisi.ad, kisi.soyad].filter(Boolean).join(' ') || '?' : '';

  /* ── İlgili Dosyalar ── */
  const ilgiliDavalar = useMemo(() => {
    if (!davalar || tip !== 'karsiTaraf' || !kisi) return [];
    return davalar.filter((d) => d.karsiId === id || d.karsi === ad);
  }, [davalar, id, ad, tip, kisi]);

  const ilgiliIcralar = useMemo(() => {
    if (!icralar || tip !== 'karsiTaraf' || !kisi) return [];
    return icralar.filter((i) =>
      i.karsiId === id ||
      i.karsiIds?.includes(id) ||
      i.karsi === ad ||
      i.borclu === ad
    );
  }, [icralar, id, ad, tip, kisi]);

  /* ── Avukat: hangi davalarda vekil olarak geçiyor ── */
  const vekilDavalar = useMemo(() => {
    if (!davalar || tip !== 'avukat' || !kisi) return [];
    return davalar.filter((d) => {
      const data = d as Record<string, unknown>;
      return data.vekilId === id || data.vekil === ad;
    });
  }, [davalar, id, ad, tip, kisi]);

  // Hook'lar her zaman çağrıldıktan sonra early return
  if (!open || !kisi) return null;

  const toplamDosya = ilgiliDavalar.length + ilgiliIcralar.length + vekilDavalar.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
              tip === 'avukat'
                ? 'bg-gold-dim border-2 border-gold text-gold'
                : (karsiTaraf?.tip === 'tuzel'
                    ? 'bg-blue-400/10 border-2 border-blue-400/30 text-blue-400'
                    : 'bg-red/10 border-2 border-red/30 text-red')
            }`}>
              {tip === 'avukat' ? 'Av.' : (karsiTaraf?.tip === 'tuzel' ? '🏢' : ad[0]?.toUpperCase() || '?')}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text truncate">{ad}</h2>
                {(() => {
                  const no = (kisi as Record<string, unknown>).kayitNo as number | undefined;
                  if (!no) return null;
                  return (
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      tip === 'avukat'
                        ? 'bg-blue-400/10 text-blue-400 border-blue-400/20'
                        : 'bg-red/10 text-red border-red/20'
                    }`}>
                      {tip === 'avukat' ? 'AV' : 'KT'}-{String(no).padStart(3, '0')}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {tip === 'karsiTaraf' && karsiTaraf && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    karsiTaraf.tip === 'tuzel' ? 'text-blue-400 bg-blue-400/10' : 'text-red bg-red/10'
                  }`}>
                    {karsiTaraf.tip === 'tuzel' ? 'TÜZEL KİŞİ' : 'GERÇEK KİŞİ'}
                  </span>
                )}
                {tip === 'avukat' && vekil?.baro && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-gold bg-gold/10">
                    {vekil.baro} Barosu
                  </span>
                )}
                {toplamDosya > 0 && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface2 text-text-muted">
                    {toplamDosya} dosya
                  </span>
                )}
              </div>
            </div>

            {/* Kapat */}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-dim hover:text-text hover:bg-surface2 transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* İçerik */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
          {/* ── Kişisel Bilgiler ── */}
          <div>
            <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Bilgiler</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {tip === 'karsiTaraf' && karsiTaraf && (
                <>
                  {karsiTaraf.tc && <InfoRow label="TC Kimlik" value={karsiTaraf.tc} />}
                  {karsiTaraf.vergiNo && <InfoRow label="Vergi No" value={karsiTaraf.vergiNo} />}
                  {karsiTaraf.vergiDairesi && <InfoRow label="Vergi Dairesi" value={karsiTaraf.vergiDairesi} />}
                  {karsiTaraf.meslek && <InfoRow label="Meslek" value={karsiTaraf.meslek} />}
                  {karsiTaraf.uyruk && karsiTaraf.uyruk !== 'T.C.' && <InfoRow label="Uyruk" value={karsiTaraf.uyruk} />}
                  {karsiTaraf.sirketTur && <InfoRow label="Şirket Türü" value={karsiTaraf.sirketTur} />}
                  {karsiTaraf.mersis && <InfoRow label="MERSİS" value={karsiTaraf.mersis} />}
                  {karsiTaraf.yetkiliAd && <InfoRow label="Yetkili" value={karsiTaraf.yetkiliAd} />}
                </>
              )}
              {tip === 'avukat' && vekil && (
                <>
                  {vekil.baro && <InfoRow label="Baro" value={`${vekil.baro} Barosu`} />}
                  {vekil.baroSicil && <InfoRow label="Baro Sicil" value={vekil.baroSicil} />}
                  {vekil.tbbSicil && <InfoRow label="TBB Sicil" value={vekil.tbbSicil} />}
                </>
              )}
            </div>
          </div>

          {/* ── İletişim ── */}
          {(kisi.tel || kisi.mail || kisi.uets) && (
            <div>
              <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">İletişim</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {kisi.tel && <InfoRow label="Telefon" value={kisi.tel} />}
                {kisi.mail && <InfoRow label="E-posta" value={kisi.mail} />}
                {kisi.uets && <InfoRow label="UETS/KEP" value={kisi.uets} />}
                {tip === 'karsiTaraf' && karsiTaraf?.faks && <InfoRow label="Faks" value={karsiTaraf.faks} />}
                {tip === 'karsiTaraf' && karsiTaraf?.web && <InfoRow label="Web" value={karsiTaraf.web} />}
              </div>
            </div>
          )}

          {/* ── Etiketler ── */}
          {kisi.etiketler && kisi.etiketler.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Etiketler</div>
              <div className="flex flex-wrap gap-1">
                {kisi.etiketler.map((e, i) => <EtiketBadge key={i} etiket={e} />)}
              </div>
            </div>
          )}

          {/* ── Adresler ── */}
          {tip === 'karsiTaraf' && karsiTaraf && (() => {
            const adresler = (karsiTaraf as Record<string, unknown>).adresler as Array<Record<string, string>> | undefined;
            const tekAdres = karsiTaraf.adres;
            if (adresler && adresler.length > 0) {
              return (
                <div>
                  <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Adresler</div>
                  <div className="space-y-1.5">
                    {adresler.map((a, i) => (
                      <div key={i} className="px-3 py-2 rounded-lg bg-surface2 border border-border/50 text-xs">
                        {a.baslik && <div className="font-medium text-text mb-0.5">{a.baslik}</div>}
                        <p className="text-text-muted">
                          {[a.acik, a.mahalle, a.ilce, a.il].filter(Boolean).join(', ')}
                        </p>
                        {a.postaKodu && <span className="text-[10px] text-text-dim">Posta Kodu: {a.postaKodu}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            if (tekAdres && Object.values(tekAdres).some(Boolean)) {
              return (
                <div>
                  <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Adres</div>
                  <p className="text-xs text-text-muted">
                    {[tekAdres.acik, tekAdres.mahalle, tekAdres.ilce, tekAdres.il].filter(Boolean).join(', ')}
                  </p>
                </div>
              );
            }
            return null;
          })()}

          {/* ── İlgili Dosyalar (Karşı Taraf) ── */}
          {tip === 'karsiTaraf' && (ilgiliDavalar.length > 0 || ilgiliIcralar.length > 0) && (
            <div>
              <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">İlgili Dosyalar</div>
              <div className="space-y-1.5">
                {ilgiliDavalar.map((d) => (
                  <Link
                    key={d.id}
                    href={`/davalar/${d.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface2 border border-border/50 hover:border-gold/40 transition-colors group"
                  >
                    <span className="text-sm">📁</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text group-hover:text-gold truncate">
                        {d.konu || d.no || 'Dava'}
                      </div>
                      <div className="text-[10px] text-text-dim">
                        {[d.mahkeme, d.esasYil && d.esasNo ? `${d.esasYil}/${d.esasNo}` : null, d.durum].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="text-text-dim group-hover:text-gold text-xs">›</span>
                  </Link>
                ))}
                {ilgiliIcralar.map((i) => (
                  <Link
                    key={i.id}
                    href={`/icra/${i.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface2 border border-border/50 hover:border-gold/40 transition-colors group"
                  >
                    <span className="text-sm">⚡</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text group-hover:text-gold truncate">
                        {i.borclu || i.no || 'İcra'}
                      </div>
                      <div className="text-[10px] text-text-dim">
                        {[i.daire, i.esas, i.durum].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="text-text-dim group-hover:text-gold text-xs">›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── İlgili Dosyalar (Avukat) ── */}
          {tip === 'avukat' && vekilDavalar.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">İlgili Dosyalar</div>
              <div className="space-y-1.5">
                {vekilDavalar.map((d) => (
                  <Link
                    key={d.id}
                    href={`/davalar/${d.id}`}
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface2 border border-border/50 hover:border-gold/40 transition-colors group"
                  >
                    <span className="text-sm">📁</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text group-hover:text-gold truncate">
                        {d.konu || d.no || 'Dava'}
                      </div>
                      <div className="text-[10px] text-text-dim">
                        {[d.mahkeme, d.durum].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="text-text-dim group-hover:text-gold text-xs">›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {toplamDosya === 0 && (
            <div className="text-center py-4 text-text-dim text-xs">
              İlişkili dosya bulunamadı
            </div>
          )}

          {/* ── Banka Hesapları ── */}
          {kisi.bankalar && kisi.bankalar.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Banka Hesapları</div>
              <div className="space-y-1.5">
                {kisi.bankalar.map((b, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg bg-surface2 border border-border/50 text-xs">
                    <div className="font-medium text-text">{b.banka || 'Banka'}</div>
                    {b.iban && <div className="text-text-muted font-mono text-[10px] mt-0.5">{b.iban}</div>}
                    {b.hesapAd && <div className="text-text-dim text-[10px]">{b.hesapAd}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Notlar ── */}
          {kisi.aciklama && (
            <div>
              <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Notlar</div>
              <p className="text-xs text-text-muted whitespace-pre-wrap">{kisi.aciklama}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex justify-between">
          <button
            onClick={() => { onSil(); }}
            className="px-3 py-1.5 text-xs font-medium text-red border border-red/30 rounded-lg hover:bg-red/10 transition-colors"
          >
            Sil
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-text-muted border border-border rounded-lg hover:bg-surface2 transition-colors"
            >
              Kapat
            </button>
            <button
              onClick={() => { onClose(); onDuzenle(); }}
              className="px-4 py-1.5 text-xs font-semibold bg-gold text-bg rounded-lg hover:bg-gold-light transition-colors"
            >
              Düzenle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Bilgi Satırı ── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] text-text-dim">{label}:</span>
      <span className="text-xs text-text ml-1">{value}</span>
    </div>
  );
}
