'use client';

import { use, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePersonel, usePersoneller, usePersonelSil, type Personel } from '@/lib/hooks/usePersonel';
import { useTodolar, type Todo } from '@/lib/hooks/useTodolar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useYetki } from '@/lib/hooks/useRol';
import { PersonelModal } from '@/components/modules/PersonelModal';
import { fmtTarih } from '@/lib/utils';

/* ══════════════════════════════════════════════════════════════
   Personel Detay Sayfasi
   ══════════════════════════════════════════════════════════════ */

const ROL_RENK: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  sahip: { bg: 'bg-gold-dim', text: 'text-gold', label: 'Büro Sahibi', icon: '👑' },
  yonetici: { bg: 'bg-gold-dim', text: 'text-gold', label: 'Yönetici', icon: '🛡️' },
  avukat: { bg: 'bg-blue-400/10', text: 'text-blue-400', label: 'Avukat', icon: '⚖️' },
  stajyer: { bg: 'bg-purple-400/10', text: 'text-purple-400', label: 'Stajyer', icon: '📚' },
  sekreter: { bg: 'bg-green-dim', text: 'text-green', label: 'Sekreter', icon: '📋' },
};

const DURUM_BADGE: Record<string, { label: string; renk: string; bg: string }> = {
  aktif: { label: 'Aktif', renk: 'text-green', bg: 'bg-green-dim border-green/20' },
  davet_gonderildi: { label: 'Davet Bekleyen', renk: 'text-gold', bg: 'bg-gold-dim border-gold/20' },
  pasif: { label: 'Pasif', renk: 'text-text-dim', bg: 'bg-surface2 border-border' },
};

const ONCELIK_RENK: Record<string, string> = {
  'Yüksek': 'text-red bg-red-dim border-red/20',
  'Orta': 'text-gold bg-gold-dim border-gold/20',
  'Düşük': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

type GorevFiltre = 'aktif' | 'gecikmis' | 'tamamlanan';

export default function PersonelDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  /* ── Veri Hook'lari ── */
  const { data: personel, isLoading } = usePersonel(id);
  const { data: gorevler } = useTodolar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { yetkili: yoneticiMi } = useYetki('kullanici:yonet');
  const silMut = usePersonelSil();

  /* ── UI State ── */
  const [modalAcik, setModalAcik] = useState(false);
  const [gorevFiltre, setGorevFiltre] = useState<GorevFiltre>('aktif');

  /* ── Title ── */
  useEffect(() => {
    if (personel) document.title = `${personel.ad || 'Personel'} | LexBase`;
  }, [personel]);

  /* ── Personelin Gorevleri ── */
  const personelGorevleri = useMemo(() => {
    if (!gorevler || !personel) return [];
    const ad = (personel.ad || '').toLocaleLowerCase('tr');
    return gorevler.filter(
      (g) => g.atananId === id || (g.atananId || '').toLocaleLowerCase('tr') === ad
    );
  }, [gorevler, personel, id]);

  /* ── Personelin Dosyalari (Dava + Icra) ── */
  const personelDavalari = useMemo(() => {
    if (!davalar || !personel) return [];
    const ad = (personel.ad || '').toLocaleLowerCase('tr');
    return davalar.filter((d) => {
      const sorumlu = ((d as Record<string, unknown>).sorumlu_avukat || (d as Record<string, unknown>).sorumlu || '') as string;
      // Vekiller dizisinde de kontrol et
      const vekiller = (d.vekiller || []) as Array<{ id: string; ad: string }>;
      const vekilMatch = vekiller.some((v) => v.id === id || v.ad.toLocaleLowerCase('tr') === ad);
      return sorumlu === id || sorumlu.toLocaleLowerCase('tr') === ad || vekilMatch;
    });
  }, [davalar, personel, id]);

  const personelIcralari = useMemo(() => {
    if (!icralar || !personel) return [];
    const ad = (personel.ad || '').toLocaleLowerCase('tr');
    return (icralar as Record<string, unknown>[]).filter((ic) => {
      const sorumlu = ((ic).sorumlu_avukat || (ic).sorumlu || '') as string;
      return sorumlu === id || sorumlu.toLocaleLowerCase('tr') === ad;
    });
  }, [icralar, personel, id]);

  /* ── Istatistikler ── */
  const stats = useMemo(() => {
    const aktifGorev = personelGorevleri.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal');
    const gecikmisSayisi = aktifGorev.filter((g) => g.sonTarih && new Date(g.sonTarih) < new Date()).length;
    const tamamlananSayisi = personelGorevleri.filter((g) => g.durum === 'Tamamlandı').length;
    const toplamGorev = personelGorevleri.length;
    const tamamlanmaOrani = toplamGorev > 0 ? Math.round((tamamlananSayisi / toplamGorev) * 100) : 0;

    const aktifDosya = personelDavalari.filter((d) =>
      ['Derdest', 'Aktif', 'Devam Ediyor'].includes(d.durum || '')
    ).length + personelIcralari.filter((ic) =>
      ['Aktif', 'Devam Ediyor'].includes((ic.durum as string) || '')
    ).length;

    const toplamDosya = personelDavalari.length + personelIcralari.length;

    return {
      aktifGorev: aktifGorev.length,
      gecikmisSayisi,
      tamamlananSayisi,
      toplamGorev,
      tamamlanmaOrani,
      aktifDosya,
      toplamDosya,
    };
  }, [personelGorevleri, personelDavalari, personelIcralari]);

  /* ── Performans Ozeti (bu ay) ── */
  const performans = useMemo(() => {
    const buAy = new Date();
    const buAyStr = `${buAy.getFullYear()}-${String(buAy.getMonth() + 1).padStart(2, '0')}`;
    const buAyTamamlanan = personelGorevleri.filter((g) => {
      if (g.durum !== 'Tamamlandı') return false;
      return (g.tamamlanmaTarih || '').startsWith(buAyStr);
    });

    // Ort. tamamlanma suresi (gun)
    let toplamGun = 0;
    let sayac = 0;
    for (const g of personelGorevleri.filter((g) => g.durum === 'Tamamlandı')) {
      if (g.olusturmaTarih && g.tamamlanmaTarih) {
        const diff = new Date(g.tamamlanmaTarih).getTime() - new Date(g.olusturmaTarih).getTime();
        toplamGun += diff / (1000 * 60 * 60 * 24);
        sayac++;
      }
    }
    const ortTamamlanma = sayac > 0 ? Math.round(toplamGun / sayac) : null;

    return {
      buAyTamamlanan: buAyTamamlanan.length,
      ortTamamlanma,
    };
  }, [personelGorevleri]);

  /* ── Gorev Filtreleme ── */
  const filtrelenmisGorevler = useMemo(() => {
    switch (gorevFiltre) {
      case 'aktif':
        return personelGorevleri.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal');
      case 'gecikmis':
        return personelGorevleri.filter(
          (g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal' && g.sonTarih && new Date(g.sonTarih) < new Date()
        );
      case 'tamamlanan':
        return personelGorevleri.filter((g) => g.durum === 'Tamamlandı');
      default:
        return personelGorevleri;
    }
  }, [personelGorevleri, gorevFiltre]);

  /* ── Kidem Hesaplama ── */
  const kidem = useMemo(() => {
    if (!personel?.baslama) return null;
    const baslama = new Date(personel.baslama);
    const now = new Date();
    const diffMs = now.getTime() - baslama.getTime();
    const yil = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));
    const ay = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
    if (yil > 0) return `${yil} yıl ${ay} ay`;
    if (ay > 0) return `${ay} ay`;
    return 'Yeni başladı';
  }, [personel]);

  /* ── Loading / Not Found ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted text-sm">Yükleniyor...</div>
      </div>
    );
  }

  if (!personel) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-4xl">🔍</div>
        <div className="text-text-muted text-sm">Personel bulunamadı</div>
        <Link href="/personel" className="text-gold text-sm hover:text-gold-light">
          ← Personel Listesine Dön
        </Link>
      </div>
    );
  }

  const rol = ROL_RENK[personel.rol || ''] || ROL_RENK.avukat;
  const durum = DURUM_BADGE[personel.durum || 'aktif'] || DURUM_BADGE.aktif;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-[11px] text-text-dim mb-4">
        <Link href="/personel" className="hover:text-gold transition-colors">Personel</Link>
        <span>/</span>
        <span className="text-text-muted">{personel.ad || 'Detay'}</span>
      </div>

      {/* ═══════════ HEADER: Profil Kartı ═══════════ */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-5">
        <div className="flex items-start gap-4">
          {/* Avatar Placeholder */}
          <div className={`w-16 h-16 rounded-full ${rol.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
            {rol.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Ad + Durum + Rol */}
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-[var(--font-playfair)] text-xl text-text font-bold">{personel.ad || '—'}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${durum.bg} ${durum.renk}`}>
                {durum.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${rol.bg} ${rol.text}`}>
                {rol.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-text-dim">
              {personel.email && <span>✉️ {personel.email}</span>}
              {personel.tel && <span>📞 {personel.tel}</span>}
              {personel.baroSicil && <span>Baro Sicil: {personel.baroSicil}</span>}
              {kidem && <span>Kıdem: {kidem}</span>}
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {yoneticiMi && (
              <>
                <button
                  onClick={() => setModalAcik(true)}
                  className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
                >
                  Düzenle
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`"${personel.ad || 'Bu personel'}" silinecek. Emin misiniz?`)) {
                      await silMut.mutateAsync(id);
                      router.push('/personel');
                    }
                  }}
                  className="px-3 py-2 border border-red/30 text-red rounded-lg text-xs hover:bg-red/10 transition-colors"
                >
                  Sil
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ KISISEL BILGILER ═══════════ */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-5">
        <h3 className="text-sm font-semibold text-text mb-4 flex items-center gap-2">
          <span>📄</span> Kişisel Bilgiler
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3">
          <InfoField label="E-posta" value={personel.email} />
          <InfoField label="Telefon" value={personel.tel} />
          <InfoField label="Baro Sicil No" value={personel.baroSicil} />
          <InfoField label="İşe Başlama Tarihi" value={personel.baslama ? new Date(personel.baslama).toLocaleDateString('tr-TR') : null} />
          {personel.tc && <InfoField label="TC Kimlik No" value={`****${personel.tc.slice(-4)}`} />}
          {personel.baro && <InfoField label="Baro" value={personel.baro} />}
          {kidem && <InfoField label="Kıdem" value={kidem} />}
          {personel.notlar && <InfoField label="Notlar" value={personel.notlar} />}
        </div>
      </div>

      {/* ═══════════ ISTATISTIKLER CARDS ROW ═══════════ */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Aktif Dosya Sayısı"
          value={stats.aktifDosya.toString()}
          icon="📁"
          color="text-blue-400"
          desc={`Toplam: ${stats.toplamDosya}`}
        />
        <StatCard
          label="Aktif Görev Sayısı"
          value={stats.aktifGorev.toString()}
          icon="📋"
          color={stats.aktifGorev >= 5 ? 'text-red' : 'text-gold'}
          desc={stats.gecikmisSayisi > 0 ? `${stats.gecikmisSayisi} gecikmiş` : undefined}
        />
        <StatCard
          label="Tamamlanan Görev"
          value={stats.tamamlananSayisi.toString()}
          icon="✅"
          color="text-green"
        />
        <StatCard
          label="Tamamlanma Oranı"
          value={`%${stats.tamamlanmaOrani}`}
          icon="📊"
          color="text-purple-400"
          progress={stats.tamamlanmaOrani}
        />
      </div>

      {/* ═══════════ ATANAN GOREVLER ═══════════ */}
      <div className="bg-surface border border-border rounded-lg mb-5">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span>✅</span> Atanan Görevler
            <span className="text-[10px] text-text-dim font-normal ml-1">({personelGorevleri.length} toplam)</span>
          </h3>
          {/* Filtre Tablari */}
          <div className="flex gap-1">
            {([
              { key: 'aktif' as GorevFiltre, label: 'Aktif', count: personelGorevleri.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal').length },
              { key: 'gecikmis' as GorevFiltre, label: 'Gecikmiş', count: personelGorevleri.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal' && g.sonTarih && new Date(g.sonTarih) < new Date()).length },
              { key: 'tamamlanan' as GorevFiltre, label: 'Tamamlandı', count: personelGorevleri.filter((g) => g.durum === 'Tamamlandı').length },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => setGorevFiltre(f.key)}
                className={`px-3 py-1.5 text-[11px] rounded-lg transition-colors ${
                  gorevFiltre === f.key ? 'bg-gold-dim text-gold font-semibold' : 'text-text-muted hover:bg-surface2'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          {personelGorevleri.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-xs text-text-muted">Bu personele atanmış görev yok</div>
            </div>
          ) : filtrelenmisGorevler.length === 0 ? (
            <div className="text-center py-8 text-text-dim text-xs">Bu filtrede görev bulunamadı</div>
          ) : (
            <div className="space-y-2">
              {filtrelenmisGorevler.map((g) => {
                const gecikmis = g.durum !== 'Tamamlandı' && g.sonTarih && new Date(g.sonTarih) < new Date();
                return (
                  <div key={g.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    gecikmis ? 'border-red/30 bg-red/[0.03]' : 'border-border hover:bg-surface2/50'
                  } transition-colors`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-sm ${g.durum === 'Tamamlandı' ? 'line-through text-text-dim' : 'text-text'}`}>
                        {g.baslik || '—'}
                      </span>
                      {gecikmis && (
                        <span className="text-[9px] text-red font-bold bg-red-dim px-1.5 py-0.5 rounded flex-shrink-0">GECİKMİŞ</span>
                      )}
                      {g.oncelik && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${ONCELIK_RENK[g.oncelik] || ''}`}>
                          {g.oncelik}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-text-dim flex-shrink-0">
                      {g.sonTarih && <span>{fmtTarih(g.sonTarih)}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        g.durum === 'Tamamlandı' ? 'bg-green-dim text-green' :
                        g.durum === 'Devam Ediyor' ? 'bg-blue-400/10 text-blue-400' :
                        'bg-surface2 text-text-muted'
                      }`}>{g.durum || 'Bekliyor'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ ATANAN DOSYALAR ═══════════ */}
      <div className="bg-surface border border-border rounded-lg mb-5">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span>📁</span> Atanan Dosyalar
            <span className="text-[10px] text-text-dim font-normal ml-1">({stats.toplamDosya} toplam)</span>
          </h3>
        </div>
        <div className="p-4">
          {stats.toplamDosya === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📁</div>
              <div className="text-xs text-text-muted">Bu personele atanmış dosya yok</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted">Dosya</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted">Tür</th>
                    <th className="text-left px-3 py-2.5 font-medium text-text-muted">Durum</th>
                    <th className="text-right px-3 py-2.5 font-medium text-text-muted">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {personelDavalari.map((d) => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-text">{d.konu || d.no || '—'}</td>
                      <td className="px-3 py-2.5 text-text-muted">{d.davaTuru || 'Dava'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          d.durum === 'Derdest' || d.durum === 'Aktif' || d.durum === 'Devam Ediyor'
                            ? 'bg-green-dim text-green' : 'bg-surface2 text-text-dim'
                        }`}>{d.durum || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/davalar/${d.id}`} className="text-[10px] text-gold hover:text-gold-light">Görüntüle</Link>
                      </td>
                    </tr>
                  ))}
                  {personelIcralari.map((ic) => (
                    <tr key={ic.id as string} className="border-b border-border/50 hover:bg-surface2/50 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-text">{(ic.konu as string) || (ic.no as string) || '—'}</td>
                      <td className="px-3 py-2.5 text-text-muted">İcra</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          (ic.durum as string) === 'Aktif' || (ic.durum as string) === 'Devam Ediyor'
                            ? 'bg-green-dim text-green' : 'bg-surface2 text-text-dim'
                        }`}>{(ic.durum as string) || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/icra/${ic.id}`} className="text-[10px] text-gold hover:text-gold-light">Görüntüle</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ PERFORMANS OZETI ═══════════ */}
      <div className="bg-surface border border-border rounded-lg mb-5">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span>📊</span> Performans Özeti
          </h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Bu Ay Tamamlanan</div>
              <div className="font-[var(--font-playfair)] text-2xl font-bold text-green">{performans.buAyTamamlanan}</div>
              <div className="text-[10px] text-text-dim">görev</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Ort. Tamamlanma Süresi</div>
              <div className="font-[var(--font-playfair)] text-2xl font-bold text-blue-400">
                {performans.ortTamamlanma !== null ? `${performans.ortTamamlanma}` : '—'}
              </div>
              <div className="text-[10px] text-text-dim">{performans.ortTamamlanma !== null ? 'gün' : 'veri yok'}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Genel Tamamlanma</div>
              <div className="font-[var(--font-playfair)] text-2xl font-bold text-gold">%{stats.tamamlanmaOrani}</div>
              <div className="w-full h-1.5 bg-surface2 rounded-full mt-2">
                <div
                  className="h-full bg-gold rounded-full transition-all"
                  style={{ width: `${stats.tamamlanmaOrani}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Yetkiler Bilgi Kutusu ── */}
      <YetkilerCard rol={personel.rol || 'avukat'} />

      {/* ── Modal ── */}
      <PersonelModal open={modalAcik} onClose={() => setModalAcik(false)} personel={personel} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Yardimci Bilesenler
   ══════════════════════════════════════════════════════════════ */

function StatCard({ label, value, icon, color, desc, progress }: {
  label: string; value: string; icon: string; color: string; desc?: string; progress?: number;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className={`font-[var(--font-playfair)] text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{label}</div>
      {desc && <div className="text-[9px] text-text-dim mt-0.5">{desc}</div>}
      {progress !== undefined && (
        <div className="w-full h-1 bg-surface2 rounded-full mt-2">
          <div
            className="h-full bg-purple-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-text">{value}</div>
    </div>
  );
}

function YetkilerCard({ rol }: { rol: string }) {
  const moduller = [
    { modul: 'Müvekkiller/Rehber', yetki: 'muvekkil', icon: '📒' },
    { modul: 'Davalar/Dosyalar', yetki: 'dosya', icon: '📁' },
    { modul: 'Finans', yetki: 'finans', icon: '💰' },
    { modul: 'Görevler', yetki: 'gorev', icon: '✅' },
    { modul: 'Takvim', yetki: 'takvim', icon: '📅' },
    { modul: 'Belgeler', yetki: 'belge', icon: '📎' },
    { modul: 'Danışmanlık', yetki: 'danismanlik', icon: '⚖️' },
    { modul: 'İletişim', yetki: 'iletisim', icon: '💬' },
    { modul: 'Personel Yönetimi', yetki: 'kullanici', icon: '👥' },
    { modul: 'Ayarlar', yetki: 'ayarlar', icon: '⚙️' },
    { modul: 'Raporlar', yetki: 'rapor', icon: '📊' },
  ];

  const yetkiMap: Record<string, Record<string, Set<string>>> = {
    sahip: { oku: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']), yaz: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']) },
    yonetici: { oku: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']), yaz: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']) },
    avukat: { oku: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','rapor']), yaz: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','rapor']) },
    stajyer: { oku: new Set(['muvekkil','dosya','gorev','takvim','belge','danismanlik','iletisim']), yaz: new Set(['gorev','belge']) },
    sekreter: { oku: new Set(['muvekkil','dosya','gorev','takvim','belge','danismanlik','iletisim','ayarlar']), yaz: new Set(['gorev','takvim','belge','iletisim']) },
  };

  const rolYetki = yetkiMap[rol] || yetkiMap.avukat;

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden mb-5">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <span>🔐</span> Yetki Matrisi — <span className={ROL_RENK[rol]?.text || 'text-text'}>{ROL_RENK[rol]?.label || rol}</span>
        </h3>
        <p className="text-[10px] text-text-dim mt-0.5">Bu rol için modül bazlı erişim izinleri</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-4 py-2 font-medium text-text-muted">Modül</th>
            <th className="text-center px-3 py-2 font-medium text-text-muted">Okuma</th>
            <th className="text-center px-3 py-2 font-medium text-text-muted">Yazma</th>
          </tr>
        </thead>
        <tbody>
          {moduller.map((m) => {
            const oku = rolYetki.oku.has(m.yetki);
            const yaz = rolYetki.yaz.has(m.yetki);
            return (
              <tr key={m.yetki} className="border-b border-border/50">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2">
                    <span>{m.icon}</span>
                    <span className="text-text">{m.modul}</span>
                  </span>
                </td>
                <td className="text-center px-3 py-2">
                  {oku ? <span className="text-green">✅</span> : <span className="text-red">❌</span>}
                </td>
                <td className="text-center px-3 py-2">
                  {yaz ? <span className="text-green">✅</span> : <span className="text-red">❌</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
