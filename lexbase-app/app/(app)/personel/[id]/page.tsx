'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePersoneller, type Personel } from '@/lib/hooks/usePersonel';
import { useTodolar, type Todo } from '@/lib/hooks/useTodolar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useYetki } from '@/lib/hooks/useRol';
import { PersonelModal } from '@/components/modules/PersonelModal';

/* ══════════════════════════════════════════════════════════════
   Personel Detay Sayfası — FAZ P3
   Sekmeler: Özet, Dosyalar, Görevler, Yetkiler
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

type Sekme = 'ozet' | 'dosyalar' | 'gorevler' | 'yetkiler';

export default function PersonelDetayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: personeller, isLoading } = usePersoneller();
  const { data: gorevler } = useTodolar();
  const { data: davalar } = useDavalar();
  const { yetkili: yoneticiMi } = useYetki('kullanici:yonet');
  const [sekme, setSekme] = useState<Sekme>('ozet');
  const [modalAcik, setModalAcik] = useState(false);

  const personel = useMemo(() => personeller?.find((p) => p.id === id), [personeller, id]);

  useEffect(() => {
    if (personel) document.title = `${personel.ad || 'Personel'} | LexBase`;
  }, [personel]);

  // Personelin görevleri
  const personelGorevleri = useMemo(() => {
    if (!gorevler || !personel) return [];
    const ad = (personel.ad || '').toLocaleLowerCase('tr');
    return gorevler.filter(
      (g) => g.atananId === id || (g.atananId || '').toLocaleLowerCase('tr') === ad
    );
  }, [gorevler, personel, id]);

  // Personelin dosyaları
  const personelDosyalari = useMemo(() => {
    if (!davalar || !personel) return [];
    const ad = (personel.ad || '').toLocaleLowerCase('tr');
    return davalar.filter((d) => {
      const sorumlu = ((d as Record<string, unknown>).sorumlu_avukat || (d as Record<string, unknown>).sorumlu || '') as string;
      return sorumlu === id || sorumlu.toLocaleLowerCase('tr') === ad;
    });
  }, [davalar, personel, id]);

  // İstatistikler
  const stats = useMemo(() => {
    const aktifGorev = personelGorevleri.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal');
    const gecikmiş = aktifGorev.filter((g) => g.sonTarih && new Date(g.sonTarih) < new Date());
    const tamamlanan = personelGorevleri.filter((g) => g.durum === 'Tamamlandı');
    const aktifDosya = personelDosyalari.filter((d) => d.durum === 'Derdest' || d.durum === 'Aktif' || d.durum === 'Devam Ediyor');

    return {
      aktifGorev: aktifGorev.length,
      gecikmiş: gecikmiş.length,
      tamamlanan: tamamlanan.length,
      toplamGorev: personelGorevleri.length,
      aktifDosya: aktifDosya.length,
      toplamDosya: personelDosyalari.length,
    };
  }, [personelGorevleri, personelDosyalari]);

  // Kıdem hesapla
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

  if (isLoading) {
    return <div className="text-center py-12 text-text-muted text-sm">Yükleniyor...</div>;
  }

  if (!personel) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-sm text-text-muted">Personel bulunamadı</p>
        <Link href="/personel" className="text-xs text-gold hover:text-gold-light mt-2 inline-block">Personel listesine dön</Link>
      </div>
    );
  }

  const rol = ROL_RENK[personel.rol || ''] || ROL_RENK.avukat;
  const durum = DURUM_BADGE[personel.durum || 'aktif'] || DURUM_BADGE.aktif;

  const sekmeler: { key: Sekme; label: string; icon: string; badge?: number }[] = [
    { key: 'ozet', label: 'Özet', icon: '📄' },
    { key: 'dosyalar', label: 'Dosyalar', icon: '📁', badge: stats.toplamDosya },
    { key: 'gorevler', label: 'Görevler', icon: '✅', badge: stats.aktifGorev },
    { key: 'yetkiler', label: 'Yetkiler', icon: '🔐' },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-text-dim mb-4">
        <Link href="/personel" className="hover:text-gold transition-colors">Personel</Link>
        <span>/</span>
        <span className="text-text-muted">{personel.ad || 'Detay'}</span>
      </div>

      {/* Profil Başlığı */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-full ${rol.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
            {rol.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-[var(--font-playfair)] text-xl text-text font-bold">{personel.ad || '—'}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${durum.bg} ${durum.renk}`}>
                {durum.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted mb-2">
              <span className={`font-medium ${rol.text}`}>{rol.label}</span>
              {personel.baroSicil && <span>Baro Sicil: {personel.baroSicil}</span>}
              {kidem && <span>Kıdem: {kidem}</span>}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-text-dim">
              {personel.email && <span>✉️ {personel.email}</span>}
              {personel.tel && <span>📞 {personel.tel}</span>}
              {personel.tc && <span>🆔 TC: ****{personel.tc.slice(-4)}</span>}
            </div>
          </div>
          {yoneticiMi && (
            <button
              onClick={() => setModalAcik(true)}
              className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors flex-shrink-0"
            >
              Düzenle
            </button>
          )}
        </div>

        {/* Mini KPI şeridi */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="font-[var(--font-playfair)] text-lg font-bold text-blue-400">{stats.aktifGorev}</div>
            <div className="text-[10px] text-text-muted">Aktif Görev</div>
          </div>
          <div className="text-center">
            <div className={`font-[var(--font-playfair)] text-lg font-bold ${stats.gecikmiş > 0 ? 'text-red' : 'text-green'}`}>{stats.gecikmiş}</div>
            <div className="text-[10px] text-text-muted">Gecikmiş</div>
          </div>
          <div className="text-center">
            <div className="font-[var(--font-playfair)] text-lg font-bold text-green">{stats.tamamlanan}</div>
            <div className="text-[10px] text-text-muted">Tamamlanan</div>
          </div>
          <div className="text-center">
            <div className="font-[var(--font-playfair)] text-lg font-bold text-gold">{stats.aktifDosya}</div>
            <div className="text-[10px] text-text-muted">Aktif Dosya</div>
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 mb-4 bg-surface border border-border rounded-lg p-1">
        {sekmeler.map((s) => (
          <button
            key={s.key}
            onClick={() => setSekme(s.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
              sekme === s.key ? 'bg-gold-dim text-gold shadow-sm' : 'text-text-muted hover:text-text hover:bg-surface2'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
            {s.badge !== undefined && s.badge > 0 && (
              <span className="ml-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-surface2 text-[9px] font-bold text-text-muted px-1">
                {s.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sekme İçerikleri */}
      {sekme === 'ozet' && <OzetSekmesi personel={personel} kidem={kidem} />}
      {sekme === 'dosyalar' && <DosyalarSekmesi dosyalar={personelDosyalari} />}
      {sekme === 'gorevler' && <GorevlerSekmesi gorevler={personelGorevleri} />}
      {sekme === 'yetkiler' && <YetkilerSekmesi rol={personel.rol || 'avukat'} />}

      <PersonelModal open={modalAcik} onClose={() => setModalAcik(false)} personel={personel} />
    </div>
  );
}

/* ── Özet Sekmesi ──────────────────────────────────────────── */
function OzetSekmesi({ personel, kidem }: { personel: Personel; kidem: string | null }) {
  const bilgiler = [
    { label: 'Ad Soyad', value: personel.ad },
    { label: 'E-posta', value: personel.email },
    { label: 'Telefon', value: personel.tel },
    { label: 'TC Kimlik No', value: personel.tc ? `****${personel.tc.slice(-4)}` : null },
    { label: 'Baro Sicil No', value: personel.baroSicil },
    { label: 'Başlama Tarihi', value: personel.baslama ? new Date(personel.baslama).toLocaleDateString('tr-TR') : null },
    { label: 'Kıdem', value: kidem },
    { label: 'Notlar', value: personel.notlar },
  ];

  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-text mb-4">Kişisel Bilgiler</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        {bilgiler.filter((b) => b.value).map((b) => (
          <div key={b.label}>
            <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">{b.label}</div>
            <div className="text-sm text-text">{b.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Dosyalar Sekmesi ──────────────────────────────────────── */
function DosyalarSekmesi({ dosyalar }: { dosyalar: Array<Record<string, unknown>> }) {
  if (dosyalar.length === 0) {
    return (
      <div className="text-center py-12 bg-surface border border-border rounded-lg">
        <div className="text-3xl mb-2">📁</div>
        <p className="text-sm text-text-muted">Bu personele atanmış dosya yok</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-surface2">
            <th className="text-left px-4 py-2.5 font-medium text-text-muted">Dosya</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-muted">Tür</th>
            <th className="text-left px-3 py-2.5 font-medium text-text-muted">Durum</th>
            <th className="text-right px-4 py-2.5 font-medium text-text-muted">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {dosyalar.map((d) => {
            const ad = (d.dosyaAd || d.ad || d.baslik || '—') as string;
            const tur = (d.dosyaTuru || d.tur || '—') as string;
            const durum = (d.durum || '—') as string;
            const id = d.id as string;
            return (
              <tr key={id} className="border-b border-border/50 hover:bg-surface2/50">
                <td className="px-4 py-2.5 font-medium text-text">{ad}</td>
                <td className="px-3 py-2.5 text-text-muted">{tur}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    durum === 'Derdest' || durum === 'Aktif' || durum === 'Devam Ediyor' ? 'bg-green-dim text-green' : 'bg-surface2 text-text-dim'
                  }`}>{durum}</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/davalar/${id}`} className="text-[10px] text-gold hover:text-gold-light">Görüntüle</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Görevler Sekmesi ──────────────────────────────────────── */
function GorevlerSekmesi({ gorevler }: { gorevler: Todo[] }) {
  const [filtre, setFiltre] = useState<'hepsi' | 'aktif' | 'tamamlanan' | 'gecikmis'>('aktif');

  const filtrelenmis = useMemo(() => {
    switch (filtre) {
      case 'aktif': return gorevler.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal');
      case 'tamamlanan': return gorevler.filter((g) => g.durum === 'Tamamlandı');
      case 'gecikmis': return gorevler.filter((g) => g.durum !== 'Tamamlandı' && g.durum !== 'İptal' && g.sonTarih && new Date(g.sonTarih) < new Date());
      default: return gorevler;
    }
  }, [gorevler, filtre]);

  if (gorevler.length === 0) {
    return (
      <div className="text-center py-12 bg-surface border border-border rounded-lg">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm text-text-muted">Bu personele atanmış görev yok</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtre */}
      <div className="flex gap-1 mb-3">
        {([
          { key: 'aktif', label: 'Aktif' },
          { key: 'gecikmis', label: 'Gecikmiş' },
          { key: 'tamamlanan', label: 'Tamamlanan' },
          { key: 'hepsi', label: 'Tümü' },
        ] as { key: typeof filtre; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltre(f.key)}
            className={`px-3 py-1.5 text-[11px] rounded-lg transition-colors ${
              filtre === f.key ? 'bg-gold-dim text-gold font-semibold' : 'text-text-muted hover:bg-surface2'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtrelenmis.map((g) => {
          const gecikmis = g.durum !== 'Tamamlandı' && g.sonTarih && new Date(g.sonTarih) < new Date();
          return (
            <div key={g.id} className={`bg-surface border rounded-lg px-4 py-3 ${gecikmis ? 'border-red/30' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${g.durum === 'Tamamlandı' ? 'line-through text-text-dim' : 'text-text'}`}>
                    {g.baslik || '—'}
                  </span>
                  {gecikmis && <span className="text-[9px] text-red font-bold bg-red-dim px-1.5 py-0.5 rounded">GECİKMİŞ</span>}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-text-dim">
                  {g.sonTarih && <span>{new Date(g.sonTarih).toLocaleDateString('tr-TR')}</span>}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    g.durum === 'Tamamlandı' ? 'bg-green-dim text-green' :
                    g.durum === 'Devam Ediyor' ? 'bg-blue-400/10 text-blue-400' :
                    'bg-surface2 text-text-muted'
                  }`}>{g.durum || 'Bekliyor'}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filtrelenmis.length === 0 && (
          <div className="text-center py-8 text-text-dim text-xs">Bu filtrede görev bulunamadı</div>
        )}
      </div>
    </div>
  );
}

/* ── Yetkiler Sekmesi ──────────────────────────────────────── */
function YetkilerSekmesi({ rol }: { rol: string }) {
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

  // Basit yetki kontrolü (useRol'dan YETKI_HARITASI kullanamayız direkt, gösterim amaçlı)
  const yetkiMap: Record<string, Record<string, Set<string>>> = {
    sahip: { oku: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']), yaz: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']) },
    yonetici: { oku: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']), yaz: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','kullanici','ayarlar','rapor']) },
    avukat: { oku: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','rapor']), yaz: new Set(['muvekkil','dosya','finans','gorev','takvim','belge','danismanlik','iletisim','rapor']) },
    stajyer: { oku: new Set(['muvekkil','dosya','gorev','takvim','belge','danismanlik','iletisim']), yaz: new Set(['gorev','belge']) },
    sekreter: { oku: new Set(['muvekkil','dosya','gorev','takvim','belge','danismanlik','iletisim','ayarlar']), yaz: new Set(['gorev','takvim','belge','iletisim']) },
  };

  const rolYetki = yetkiMap[rol] || yetkiMap.avukat;

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface2">
        <h3 className="text-xs font-semibold text-text">
          Yetki Matrisi — <span className={ROL_RENK[rol]?.text || 'text-text'}>{ROL_RENK[rol]?.label || rol}</span>
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
