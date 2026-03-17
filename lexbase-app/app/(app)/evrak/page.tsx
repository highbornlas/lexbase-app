'use client';

import { useState, useMemo, useEffect } from 'react';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';

const SABLONLAR = [
  {
    id: 'vekaletname',
    baslik: 'Vekaletname',
    aciklama: 'Genel vekaletname şablonu',
    kategori: 'Genel',
    icon: '📜',
  },
  {
    id: 'dava-dilekce',
    baslik: 'Dava Dilekçesi',
    aciklama: 'Hukuk mahkemesi dava dilekçesi',
    kategori: 'Dava',
    icon: '⚖️',
  },
  {
    id: 'cevap-dilekce',
    baslik: 'Cevap Dilekçesi',
    aciklama: 'Davalı cevap dilekçesi',
    kategori: 'Dava',
    icon: '📝',
  },
  {
    id: 'istinaf-dilekce',
    baslik: 'İstinaf Dilekçesi',
    aciklama: 'İstinaf başvuru dilekçesi',
    kategori: 'Dava',
    icon: '📋',
  },
  {
    id: 'temyiz-dilekce',
    baslik: 'Temyiz Dilekçesi',
    aciklama: 'Temyiz başvuru dilekçesi',
    kategori: 'Dava',
    icon: '🏛️',
  },
  {
    id: 'icra-takip',
    baslik: 'İcra Takip Talebi',
    aciklama: 'İlamlı/ilamsız icra takip talebi',
    kategori: 'İcra',
    icon: '📋',
  },
  {
    id: 'haciz-talebi',
    baslik: 'Haciz Talebi',
    aciklama: 'Menkul/gayrimenkul haciz talebi',
    kategori: 'İcra',
    icon: '🔒',
  },
  {
    id: 'ihtarname',
    baslik: 'İhtarname',
    aciklama: 'Noterden gönderilecek ihtarname',
    kategori: 'İhtarname',
    icon: '📨',
  },
  {
    id: 'fesih-ihtari',
    baslik: 'Fesih İhtarı',
    aciklama: 'Sözleşme fesih ihtarnamesi',
    kategori: 'İhtarname',
    icon: '✋',
  },
  {
    id: 'odeme-ihtari',
    baslik: 'Ödeme İhtarı',
    aciklama: 'Borç ödeme ihtar yazısı',
    kategori: 'İhtarname',
    icon: '💰',
  },
  {
    id: 'arabuluculuk-basvuru',
    baslik: 'Arabuluculuk Başvurusu',
    aciklama: 'Zorunlu/ihtiyari arabuluculuk başvuru dilekçesi',
    kategori: 'Arabuluculuk',
    icon: '🤝',
  },
  {
    id: 'arabuluculuk-tutanak',
    baslik: 'Arabuluculuk Tutanağı',
    aciklama: 'Arabuluculuk oturumu tutanağı',
    kategori: 'Arabuluculuk',
    icon: '📄',
  },
  {
    id: 'sozlesme-genel',
    baslik: 'Sözleşme (Genel)',
    aciklama: 'Genel amaçlı sözleşme şablonu',
    kategori: 'Sözleşme',
    icon: '📑',
  },
  {
    id: 'danismanlik-sozlesme',
    baslik: 'Danışmanlık Sözleşmesi',
    aciklama: 'Hukuki danışmanlık hizmet sözleşmesi',
    kategori: 'Sözleşme',
    icon: '🤝',
  },
  {
    id: 'makbuz',
    baslik: 'Serbest Meslek Makbuzu',
    aciklama: 'Avukatlık ücretine ait makbuz',
    kategori: 'Finans',
    icon: '🧾',
  },
  {
    id: 'masraf-listesi',
    baslik: 'Masraf Listesi',
    aciklama: 'Dosya masraf dökümü raporu',
    kategori: 'Finans',
    icon: '📊',
  },
];

const KATEGORILER = ['Tümü', 'Genel', 'Dava', 'İcra', 'İhtarname', 'Arabuluculuk', 'Sözleşme', 'Finans'];

const KATEGORI_RENK: Record<string, string> = {
  'Genel': 'bg-surface2 text-text-muted border-border',
  'Dava': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'İcra': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'İhtarname': 'bg-red-dim text-red border-red/20',
  'Arabuluculuk': 'bg-gold-dim text-gold border-gold/20',
  'Sözleşme': 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  'Finans': 'bg-green-dim text-green border-green/20',
};

export default function EvrakPage() {
  useEffect(() => { document.title = 'Evrak Şablonları | LexBase'; }, []);

  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();

  const [secilenKategori, setSecilenKategori] = useState('Tümü');
  const [arama, setArama] = useState('');
  const [secilenSablon, setSecilenSablon] = useState<string | null>(null);
  const [gorunum, setGorunum] = useState<'klasor' | 'liste'>('klasor');

  // Sablon filtreleme
  const filtrelenmis = useMemo(() => {
    return SABLONLAR.filter((s) => {
      if (secilenKategori !== 'Tümü' && s.kategori !== secilenKategori) return false;
      if (arama) {
        const q = arama.toLocaleLowerCase('tr');
        return s.baslik.toLocaleLowerCase('tr').includes(q) || s.aciklama.toLocaleLowerCase('tr').includes(q);
      }
      return true;
    });
  }, [secilenKategori, arama]);

  // Kategori bazlı şablon sayıları
  const kategoriSayilari = useMemo(() => {
    const map: Record<string, number> = {};
    SABLONLAR.forEach((s) => {
      map[s.kategori] = (map[s.kategori] || 0) + 1;
    });
    return map;
  }, []);

  // İstatistikler
  const istatistikler = useMemo(() => ({
    sablonSayisi: SABLONLAR.length,
    kategoriSayisi: KATEGORILER.length - 1,
    muvekkilSayisi: muvekkillar?.length || 0,
    dosyaSayisi: (davalar?.length || 0) + (icralar?.length || 0),
  }), [muvekkillar, davalar, icralar]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Evrak Üretici
        </h1>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">📄</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Şablon</span>
          </div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-gold">{istatistikler.sablonSayisi}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">📂</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Kategori</span>
          </div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-text">{istatistikler.kategoriSayisi}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">👥</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Müvekkil</span>
          </div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-blue-400">{istatistikler.muvekkilSayisi}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">📋</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Dosya</span>
          </div>
          <div className="font-[var(--font-playfair)] text-lg font-bold text-green">{istatistikler.dosyaSayisi}</div>
        </div>
      </div>

      {/* Arama + Görünüm Toggle */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Şablon ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button type="button" onClick={() => setGorunum('klasor')}
            className={`px-2.5 py-1.5 text-xs transition-colors ${gorunum === 'klasor' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'}`}
            title="Klasör Görünümü">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4l2-2h3l1 1h5a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"/></svg>
          </button>
          <button type="button" onClick={() => setGorunum('liste')}
            className={`px-2.5 py-1.5 text-xs transition-colors ${gorunum === 'liste' ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text'}`}
            title="Liste Görünümü">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h10M3 8h10M3 12h10"/></svg>
          </button>
        </div>
      </div>

      {gorunum === 'liste' ? (
        /* Liste Görünümü */
        <div className="flex-1">
          {filtrelenmis.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-border rounded-lg">
              <div className="text-4xl mb-3">📄</div>
              <div className="text-sm text-text-muted">Bu kategoride şablon bulunamadı</div>
            </div>
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-surface/50">
              {/* Tablo Başlık */}
              <div className="flex items-center gap-3 px-4 py-2 bg-surface2/30 border-b border-border/40 text-[10px] font-bold text-text-dim uppercase tracking-wider">
                <div className="w-8" />
                <div className="flex-1">Şablon Adı</div>
                <div className="w-28 text-center">Kategori</div>
                <div className="w-48">Açıklama</div>
              </div>
              {filtrelenmis.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setSecilenSablon(secilenSablon === s.id ? null : s.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
                    i < filtrelenmis.length - 1 ? 'border-b border-border/20' : ''
                  } ${secilenSablon === s.id ? 'bg-gold/5 border-l-2 border-l-gold' : 'hover:bg-surface2/40 border-l-2 border-l-transparent'}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-surface2/80 flex items-center justify-center flex-shrink-0 text-lg">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-text group-hover:text-gold transition-colors">{s.baslik}</span>
                  </div>
                  <div className="w-28 text-center">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${KATEGORI_RENK[s.kategori] || 'bg-surface2 text-text-dim border-border'}`}>
                      {s.kategori}
                    </span>
                  </div>
                  <div className="w-48 text-[11px] text-text-muted truncate">{s.aciklama}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[200px_1fr] gap-4 flex-1">
          {/* Sidebar: Kategoriler */}
          <div className="bg-surface border border-border rounded-lg p-3">
            <h3 className="text-xs font-semibold text-text mb-3 uppercase tracking-wider">Kategoriler</h3>
            <div className="space-y-1">
              {KATEGORILER.map((kat) => {
                const sayi = kat === 'Tümü' ? SABLONLAR.length : (kategoriSayilari[kat] || 0);
                return (
                  <button
                    key={kat}
                    onClick={() => setSecilenKategori(kat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      secilenKategori === kat
                        ? 'bg-gold-dim text-gold'
                        : 'text-text-muted hover:bg-surface2 hover:text-text'
                    }`}
                  >
                    <span>{kat}</span>
                    <span className="text-[10px] text-text-dim">{sayi}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sablon Grid */}
          <div>
            {filtrelenmis.length === 0 ? (
              <div className="text-center py-16 bg-surface border border-border rounded-lg">
                <div className="text-4xl mb-3">📄</div>
                <div className="text-sm text-text-muted">Bu kategoride şablon bulunamadı</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filtrelenmis.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSecilenSablon(secilenSablon === s.id ? null : s.id)}
                    className={`bg-surface border rounded-lg p-4 text-left transition-all hover:border-gold group ${
                      secilenSablon === s.id ? 'border-gold bg-gold-dim' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{s.icon}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${KATEGORI_RENK[s.kategori] || 'bg-surface2 text-text-dim border-border'}`}>
                        {s.kategori}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-text mb-1 group-hover:text-gold transition-colors">
                      {s.baslik}
                    </h4>
                    <p className="text-[11px] text-text-muted leading-relaxed">{s.aciklama}</p>

                    {secilenSablon === s.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="text-[11px] text-gold font-medium mb-2">Evrak oluşturmak için:</div>
                        <div className="space-y-1.5 text-[11px] text-text-muted">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px]">1️⃣</span>
                            <span>Müvekkil seçin</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px]">2️⃣</span>
                            <span>İlgili dosyayı seçin</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px]">3️⃣</span>
                            <span>Bilgileri doldurun</span>
                          </div>
                        </div>
                        <button className="w-full mt-3 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors">
                          Oluşturmaya Başla
                        </button>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bilgi Notu */}
      <div className="mt-5 bg-surface border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div>
            <h4 className="text-sm font-semibold text-text mb-1">Evrak Üretici Hakkında</h4>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Şablonları kullanarak müvekkil ve dosya bilgilerinizi otomatik dolduran hukuki evraklar oluşturabilirsiniz.
              Oluşturulan evraklar Word (.docx) formatında indirilir ve düzenlenebilir.
              Şablonlar güncel mevzuata uygun olarak hazırlanmıştır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
