'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useKullanici } from '@/lib/hooks/useBuro';
import { useCopKutusu, getCopKutusuSuresi, setCopKutusuSuresi, SURE_SECENEKLERI } from '@/lib/hooks/useCopKutusu';
import { useMuvekkilGeriYukle, useMuvekkilKaliciSil } from '@/lib/hooks/useMuvekkillar';
import { useKarsiTarafGeriYukle, useKarsiTarafKaliciSil } from '@/lib/hooks/useKarsiTaraflar';
import { useVekilGeriYukle, useVekilKaliciSil } from '@/lib/hooks/useVekillar';
import { useDavaGeriYukle, useDavaKaliciSil } from '@/lib/hooks/useDavalar';
import { useIcraGeriYukle, useIcraKaliciSil } from '@/lib/hooks/useIcra';
import { useIhtarnameGeriYukle, useIhtarnameHardSil } from '@/lib/hooks/useIhtarname';

const TABS = [
  { key: 'profil', label: 'Profil', icon: '👤' },
  { key: 'sifre', label: 'Şifre', icon: '🔒' },
  { key: 'buro', label: 'Büro Bilgileri', icon: '🏢' },
  { key: 'cop', label: 'Çöp Kutusu', icon: '🗑️' },
  { key: 'tema', label: 'Tema', icon: '🎨' },
];

export default function AyarlarPage() {
  const [aktifTab, setAktifTab] = useState('profil');

  return (
    <div>
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-6">Ayarlar</h1>

      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Sol menü */}
        <div className="bg-surface border border-border rounded-lg p-2 self-start">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setAktifTab(tab.key)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                aktifTab === tab.key
                  ? 'bg-gold-dim text-gold'
                  : 'text-text-muted hover:bg-surface2 hover:text-text'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* İçerik */}
        <div className="bg-surface border border-border rounded-lg p-6">
          {aktifTab === 'profil' && <ProfilTab />}
          {aktifTab === 'sifre' && <SifreTab />}
          {aktifTab === 'buro' && <BuroTab />}
          {aktifTab === 'cop' && <CopKutusuTab />}
          {aktifTab === 'tema' && <TemaTab />}
        </div>
      </div>
    </div>
  );
}

// ── Profil ───────────────────────────────────────────────────
function ProfilTab() {
  const kullanici = useKullanici();
  const [ad, setAd] = useState('');
  const [tel, setTel] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (kullanici) {
      setAd((kullanici.ad_soyad as string) || '');
      setTel((kullanici.telefon as string) || '');
    }
  }, [kullanici]);

  const kaydet = async () => {
    setYukleniyor(true);
    setMesaj('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      await supabase
        .from('kullanicilar')
        .update({ ad_soyad: ad, telefon: tel })
        .eq('auth_id', user.id);

      setMesaj('Profil güncellendi.');
    } catch {
      setMesaj('Hata oluştu.');
    }
    setYukleniyor(false);
  };

  const rolLabel: Record<string, string> = {
    sahip: 'Büro Sahibi', avukat: 'Avukat', stajyer: 'Stajyer', sekreter: 'Sekreter',
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-text mb-4">Profil Bilgileri</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs text-text-muted mb-1">E-posta</label>
          <input type="text" value={(kullanici?.email as string) || ''} disabled
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text-dim" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Ad Soyad</label>
          <input type="text" value={ad} onChange={(e) => setAd(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Telefon</label>
          <input type="text" value={tel} onChange={(e) => setTel(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Rol</label>
          <span className="text-xs text-gold font-medium">{rolLabel[(kullanici?.rol as string) || ''] || (kullanici?.rol as string) || '—'}</span>
        </div>

        {mesaj && (
          <div className={`text-xs px-3 py-2 rounded-lg ${mesaj.includes('Hata') ? 'bg-red-dim text-red' : 'bg-green-dim text-green'}`}>
            {mesaj}
          </div>
        )}

        <button onClick={kaydet} disabled={yukleniyor}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors disabled:opacity-50">
          {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

// ── Şifre ────────────────────────────────────────────────────
function SifreTab() {
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const guc = yeniSifre.length >= 8
    ? (/[A-Z]/.test(yeniSifre) && /[a-z]/.test(yeniSifre) && /[0-9]/.test(yeniSifre) ? 'Güçlü' : 'Orta')
    : yeniSifre.length > 0 ? 'Zayıf' : '';

  const degistir = async () => {
    if (yeniSifre.length < 8) { setMesaj('Şifre en az 8 karakter olmalı.'); return; }
    if (yeniSifre !== yeniSifreTekrar) { setMesaj('Şifreler eşleşmiyor.'); return; }

    setYukleniyor(true);
    setMesaj('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: yeniSifre });
      if (error) throw error;
      setMesaj('Şifre güncellendi.');
      setYeniSifre('');
      setYeniSifreTekrar('');
    } catch {
      setMesaj('Şifre değiştirilemedi.');
    }
    setYukleniyor(false);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-text mb-4">Şifre Değiştir</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs text-text-muted mb-1">Yeni Şifre</label>
          <input type="password" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold"
            placeholder="En az 8 karakter" />
          {guc && (
            <div className={`text-[10px] mt-1 font-medium ${
              guc === 'Güçlü' ? 'text-green' : guc === 'Orta' ? 'text-gold' : 'text-red'
            }`}>
              Şifre gücü: {guc}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Yeni Şifre (Tekrar)</label>
          <input type="password" value={yeniSifreTekrar} onChange={(e) => setYeniSifreTekrar(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold" />
        </div>

        {mesaj && (
          <div className={`text-xs px-3 py-2 rounded-lg ${mesaj.includes('güncellendi') ? 'bg-green-dim text-green' : 'bg-red-dim text-red'}`}>
            {mesaj}
          </div>
        )}

        <button onClick={degistir} disabled={yukleniyor}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors disabled:opacity-50">
          {yukleniyor ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
        </button>
      </div>
    </div>
  );
}

// ── Büro Bilgileri ───────────────────────────────────────────
function BuroTab() {
  const kullanici = useKullanici();
  const [buroAd, setBuroAd] = useState('');
  const [buroTel, setBuroTel] = useState('');
  const [buroMail, setBuroMail] = useState('');
  const [buroAdres, setBuroAdres] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (kullanici) {
      setBuroAd((kullanici.buro_ad as string) || '');
      setBuroTel((kullanici.buro_tel as string) || '');
      setBuroMail((kullanici.buro_mail as string) || '');
      setBuroAdres((kullanici.buro_adres as string) || '');
    }
  }, [kullanici]);

  const kaydet = async () => {
    setYukleniyor(true);
    setMesaj('');
    try {
      const supabase = createClient();
      const buroId = (kullanici as Record<string, unknown>)?.buro_id;
      if (!buroId) throw new Error('Büro bulunamadı');

      await supabase
        .from('burolar')
        .update({ ad: buroAd, tel: buroTel, mail: buroMail, adres: buroAdres })
        .eq('id', buroId);

      setMesaj('Büro bilgileri güncellendi.');
    } catch {
      setMesaj('Hata oluştu.');
    }
    setYukleniyor(false);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-text mb-4">Büro Bilgileri</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs text-text-muted mb-1">Büro Adı</label>
          <input type="text" value={buroAd} onChange={(e) => setBuroAd(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Telefon</label>
          <input type="text" value={buroTel} onChange={(e) => setBuroTel(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">E-posta</label>
          <input type="email" value={buroMail} onChange={(e) => setBuroMail(e.target.value)}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold" />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Adres</label>
          <textarea value={buroAdres} onChange={(e) => setBuroAdres(e.target.value)} rows={3}
            className="w-full px-3 py-2 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold resize-none" />
        </div>

        {mesaj && (
          <div className={`text-xs px-3 py-2 rounded-lg ${mesaj.includes('Hata') ? 'bg-red-dim text-red' : 'bg-green-dim text-green'}`}>
            {mesaj}
          </div>
        )}

        <button onClick={kaydet} disabled={yukleniyor}
          className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors disabled:opacity-50">
          {yukleniyor ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
}

// ── Çöp Kutusu ──────────────────────────────────────────────
function CopKutusuTab() {
  const { data: silinenler, isLoading } = useCopKutusu();
  const [sure, setSure] = useState(0);
  const [tick, setTick] = useState(0);

  const mGeriYukle = useMuvekkilGeriYukle();
  const mKaliciSil = useMuvekkilKaliciSil();
  const ktGeriYukle = useKarsiTarafGeriYukle();
  const ktKaliciSil = useKarsiTarafKaliciSil();
  const vGeriYukle = useVekilGeriYukle();
  const vKaliciSil = useVekilKaliciSil();
  const dGeriYukle = useDavaGeriYukle();
  const dKaliciSil = useDavaKaliciSil();
  const iGeriYukle = useIcraGeriYukle();
  const iKaliciSil = useIcraKaliciSil();
  const ihGeriYukle = useIhtarnameGeriYukle();
  const ihKaliciSil = useIhtarnameHardSil();

  useEffect(() => {
    setSure(getCopKutusuSuresi());
  }, []);

  // Live countdown — her saniye tick artır
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function handleSureDegistir(ms: number) {
    setCopKutusuSuresi(ms);
    setSure(ms);
  }

  function handleGeriYukle(tablo: string, id: string) {
    if (tablo === 'muvekkillar') mGeriYukle.mutate(id);
    else if (tablo === 'karsi_taraflar') ktGeriYukle.mutate(id);
    else if (tablo === 'vekillar') vGeriYukle.mutate(id);
    else if (tablo === 'davalar') dGeriYukle.mutate(id);
    else if (tablo === 'icra') iGeriYukle.mutate(id);
    else if (tablo === 'ihtarnameler') ihGeriYukle.mutate(id);
  }

  function handleKaliciSil(tablo: string, id: string) {
    if (tablo === 'muvekkillar') mKaliciSil.mutate(id);
    else if (tablo === 'karsi_taraflar') ktKaliciSil.mutate(id);
    else if (tablo === 'vekillar') vKaliciSil.mutate(id);
    else if (tablo === 'davalar') dKaliciSil.mutate(id);
    else if (tablo === 'icra') iKaliciSil.mutate(id);
    else if (tablo === 'ihtarnameler') ihKaliciSil.mutate(id);
  }

  function kalanSureFormat(silinmeTarihi: string): string {
    const saklamaSuresi = getCopKutusuSuresi();
    const ms = saklamaSuresi - (Date.now() - new Date(silinmeTarihi).getTime());
    if (ms <= 0) return 'Süresi doldu';
    const saat = Math.floor(ms / (1000 * 60 * 60));
    const dk = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const sn = Math.floor((ms % (1000 * 60)) / 1000);
    if (saat > 24) return `${Math.floor(saat / 24)} gün ${saat % 24} saat`;
    if (saat > 0) return `${saat} saat ${dk} dk ${sn} sn`;
    if (dk > 0) return `${dk} dk ${sn} sn`;
    return `${sn} sn`;
  }

  // tick kullanımı — React'ın optimize etmemesi için
  void tick;

  function badgeClass(tablo: string): string {
    switch (tablo) {
      case 'muvekkillar': return 'text-green bg-green-dim';
      case 'karsi_taraflar': return 'text-red bg-red/10';
      case 'vekillar': return 'text-gold bg-gold/10';
      case 'davalar': return 'text-yellow-600 bg-yellow-500/10';
      case 'icra': return 'text-purple-400 bg-purple-500/10';
      case 'ihtarnameler': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-text-muted bg-surface2';
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Çöp Kutusu</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Saklama süresi:</span>
          <select
            value={sure}
            onChange={(e) => handleSureDegistir(Number(e.target.value))}
            className="px-2 py-1 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
          >
            {SURE_SECENEKLERI.map((s) => (
              <option key={s.ms} value={s.ms}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-[11px] text-text-dim mb-4">
        Silinen kayıtlar burada saklanır. Saklama süresi dolduğunda otomatik olarak kalıcı silinir.
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-sm">Yükleniyor...</div>
      ) : !silinenler || silinenler.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">🗑️</div>
          <p className="text-sm text-text-muted">Çöp kutusu boş</p>
          <p className="text-[11px] text-text-dim mt-1">Silinen kayıtlar burada görünür</p>
        </div>
      ) : (
        <div className="space-y-2">
          {silinenler.map((s) => (
            <div
              key={`${s.tablo}-${s.id}`}
              className="flex items-center gap-3 bg-surface2 border border-border/50 rounded-lg px-4 py-3"
            >
              {/* Tip badge */}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeClass(s.tablo)}`}>
                {s.tabloLabel}
              </span>

              {/* Ad */}
              <div className="flex-1 min-w-0">
                <span className="text-sm text-text font-medium truncate block">{s.ad || '(adsız)'}</span>
                <span className="text-[10px] text-text-dim">
                  Silindi: {new Date(s.silinmeTarihi).toLocaleString('tr-TR')} — Kalan: {kalanSureFormat(s.silinmeTarihi)}
                </span>
              </div>

              {/* Geri Yükle */}
              <button
                onClick={() => handleGeriYukle(s.tablo, s.id)}
                className="px-2.5 py-1 text-[11px] font-medium text-green border border-green/30 rounded-lg hover:bg-green/10 transition-colors"
              >
                Geri Yükle
              </button>

              {/* Kalıcı Sil */}
              <button
                onClick={() => handleKaliciSil(s.tablo, s.id)}
                className="px-2.5 py-1 text-[11px] font-medium text-red border border-red/30 rounded-lg hover:bg-red/10 transition-colors"
              >
                Kalıcı Sil
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tema ─────────────────────────────────────────────────────
function TemaTab() {
  const [tema, setTema] = useState('koyu');

  useEffect(() => {
    const kayitli = localStorage.getItem('hukuk_tema') || 'koyu';
    setTema(kayitli);
  }, []);

  const temaSecim = (yeni: string) => {
    setTema(yeni);
    localStorage.setItem('hukuk_tema', yeni);
    document.documentElement.setAttribute('data-tema', yeni);
  };

  const temalar = [
    { key: 'koyu', label: 'Koyu', icon: '🌙', desc: 'Göz yormayan karanlık tema' },
    { key: 'acik', label: 'Açık', icon: '☀️', desc: 'Parlak, aydınlık tema' },
    { key: 'sistem', label: 'Sistem', icon: '💻', desc: 'İşletim sistemi ayarını takip et' },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-text mb-4">Tema Ayarları</h3>
      <div className="grid grid-cols-3 gap-3 max-w-lg">
        {temalar.map((t) => (
          <button
            key={t.key}
            onClick={() => temaSecim(t.key)}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              tema === t.key
                ? 'border-gold bg-gold-dim'
                : 'border-border bg-surface2 hover:border-gold/30'
            }`}
          >
            <div className="text-2xl mb-2">{t.icon}</div>
            <div className="text-xs font-semibold text-text">{t.label}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
