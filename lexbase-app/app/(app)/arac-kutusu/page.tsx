'use client';

import { useState } from 'react';

const ARACLAR = [
  {
    kategori: 'Hesaplama',
    items: [
      { icon: '⚖️', ad: 'Vekalet Ücreti Hesaplama', aciklama: 'AAÜT tarifesine göre vekalet ücreti hesaplayın' },
      { icon: '📊', ad: 'Faiz Hesaplama', aciklama: 'Yasal, ticari ve temerrüt faizi hesaplayın' },
      { icon: '💰', ad: 'Harç Hesaplama', aciklama: 'Dava ve icra harçlarını hesaplayın' },
      { icon: '📐', ad: 'Tazminat Hesaplama', aciklama: 'İş kazası ve tazminat hesaplamaları' },
    ],
  },
  {
    kategori: 'Evrak Üretici',
    items: [
      { icon: '📝', ad: 'Dilekçe Şablonları', aciklama: 'Hazır dilekçe şablonlarından hızlıca oluşturun' },
      { icon: '📨', ad: 'İhtarname Şablonları', aciklama: 'Noter ihtarnamesi ve ihbarname şablonları' },
      { icon: '📑', ad: 'Sözleşme Şablonları', aciklama: 'Vekalet, kira, iş sözleşmesi şablonları' },
      { icon: '🧾', ad: 'Makbuz / Fatura', aciklama: 'Serbest meslek makbuzu ve fatura oluşturun' },
    ],
  },
  {
    kategori: 'Bilgi',
    items: [
      { icon: '🏛', ad: 'Mahkeme Bilgileri', aciklama: 'Mahkeme adres, telefon ve IBAN bilgileri' },
      { icon: '📞', ad: 'İcra Dairesi Bilgileri', aciklama: 'İcra dairesi iletişim ve hesap bilgileri' },
      { icon: '📅', ad: 'Adli Takvim', aciklama: 'Resmi tatiller ve adli tatil tarihleri' },
      { icon: '📖', ad: 'Mevzuat Arama', aciklama: 'Kanun ve yönetmelik arama motoru' },
    ],
  },
  {
    kategori: 'Araçlar',
    items: [
      { icon: '🔍', ad: 'TC Kimlik Doğrulama', aciklama: 'TC kimlik numarası geçerlilik kontrolü' },
      { icon: '🏢', ad: 'Vergi No Sorgulama', aciklama: 'Vergi kimlik numarası sorgulama' },
      { icon: '📋', ad: 'IBAN Doğrulama', aciklama: 'IBAN numarası format kontrolü' },
      { icon: '🔄', ad: 'Döviz Kurları', aciklama: 'Güncel TCMB döviz kurları' },
    ],
  },
];

export default function AracKutusuPage() {
  const [arama, setArama] = useState('');

  const filtrelenmis = arama
    ? ARACLAR.map((kat) => ({
        ...kat,
        items: kat.items.filter(
          (a) =>
            a.ad.toLowerCase().includes(arama.toLowerCase()) ||
            a.aciklama.toLowerCase().includes(arama.toLowerCase())
        ),
      })).filter((kat) => kat.items.length > 0)
    : ARACLAR;

  return (
    <div>
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-1">Araç Kutusu</h1>
      <p className="text-sm text-text-muted mb-6">Hukuki hesaplama, evrak üretici ve bilgi araçları</p>

      {/* Arama */}
      <div className="mb-6 relative max-w-md">
        <input
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="🔍 Araç ara..."
          className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      {/* Kategoriler */}
      <div className="space-y-8">
        {filtrelenmis.map((kat) => (
          <div key={kat.kategori}>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">{kat.kategori}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {kat.items.map((arac) => (
                <button
                  key={arac.ad}
                  className="bg-surface border border-border rounded-lg p-4 text-left hover:border-gold hover:bg-gold-dim transition-all group"
                >
                  <div className="text-2xl mb-2">{arac.icon}</div>
                  <div className="text-sm font-semibold text-text group-hover:text-gold transition-colors mb-1">{arac.ad}</div>
                  <div className="text-[11px] text-text-muted leading-relaxed">{arac.aciklama}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
