'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useKullanici } from '@/lib/hooks/useBuro';
import { SectionTitle, FieldGroup, AyarInput, AyarTextarea, StatusMessage, SaveButton, Separator } from './shared';

/* ══════════════════════════════════════════════════════════════
   Profil Tab — Kişisel bilgiler, baro sicil, uzmanlık alanları
   ══════════════════════════════════════════════════════════════ */

const ROL_LABEL: Record<string, string> = {
  sahip: 'Büro Sahibi',
  yonetici: 'Yönetici',
  avukat: 'Avukat',
  stajyer: 'Stajyer',
  sekreter: 'Sekreter',
};

const UZMANLIK_ALANLARI = [
  'Ceza Hukuku', 'Aile Hukuku', 'İş Hukuku', 'İcra ve İflas Hukuku',
  'Ticaret Hukuku', 'İdare Hukuku', 'Gayrimenkul Hukuku', 'Tüketici Hukuku',
  'Fikri Mülkiyet', 'Vergi Hukuku', 'Miras Hukuku', 'Sağlık Hukuku',
  'Bilişim Hukuku', 'Uluslararası Hukuk', 'Çevre Hukuku', 'Spor Hukuku',
];

export function ProfilTab() {
  const kullanici = useKullanici();
  const [ad, setAd] = useState('');
  const [tel, setTel] = useState('');
  const [tc, setTc] = useState('');
  const [baroSicil, setBaroSicil] = useState('');
  const [baro, setBaro] = useState('');
  const [unvan, setUnvan] = useState('');
  const [uzmanliklar, setUzmanliklar] = useState<string[]>([]);
  const [notlar, setNotlar] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (kullanici) {
      setAd((kullanici.ad_soyad as string) || '');
      setTel((kullanici.telefon as string) || '');
      setTc((kullanici.tc as string) || '');
      setBaroSicil((kullanici.baro_sicil as string) || '');
      setBaro((kullanici.baro as string) || '');
      setUnvan((kullanici.unvan as string) || '');
      setUzmanliklar((kullanici.uzmanliklar as string[]) || []);
      setNotlar((kullanici.notlar as string) || '');
    }
  }, [kullanici]);

  const kaydet = async () => {
    if (!ad.trim()) { setMesaj('Ad Soyad zorunludur.'); return; }
    setYukleniyor(true);
    setMesaj('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Oturum bulunamadı');

      await supabase
        .from('kullanicilar')
        .update({
          ad_soyad: ad.trim(),
          telefon: tel.trim(),
          tc: tc.trim(),
          baro_sicil: baroSicil.trim(),
          baro: baro.trim(),
          unvan: unvan.trim(),
          uzmanliklar,
          notlar: notlar.trim(),
        })
        .eq('auth_id', user.id);

      setMesaj('Profil güncellendi.');
    } catch {
      setMesaj('Hata oluştu.');
    }
    setYukleniyor(false);
  };

  function toggleUzmanlik(alan: string) {
    setUzmanliklar((prev) =>
      prev.includes(alan) ? prev.filter((a) => a !== alan) : [...prev, alan]
    );
  }

  return (
    <div>
      <SectionTitle sub="Kişisel ve mesleki bilgileriniz">Profil Bilgileri</SectionTitle>

      <div className="space-y-4 max-w-lg">
        {/* Temel Bilgiler */}
        <FieldGroup label="E-posta">
          <AyarInput type="text" value={(kullanici?.email as string) || ''} disabled />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Ad Soyad" required>
            <AyarInput type="text" value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad Soyad" />
          </FieldGroup>
          <FieldGroup label="Telefon">
            <AyarInput type="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="0532 000 0000" />
          </FieldGroup>
        </div>

        <FieldGroup label="Rol">
          <span className="text-xs text-gold font-medium">
            {ROL_LABEL[(kullanici?.rol as string) || ''] || (kullanici?.rol as string) || '—'}
          </span>
        </FieldGroup>

        <Separator />

        {/* Mesleki Bilgiler */}
        <SectionTitle sub="Baro kaydı ve mesleki detaylar">Mesleki Bilgiler</SectionTitle>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="TC Kimlik No" hint="Vekaletname ve resmi işlemler için">
            <AyarInput
              type="text"
              value={tc}
              onChange={(e) => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="11 haneli TC"
              maxLength={11}
            />
          </FieldGroup>
          <FieldGroup label="Unvan">
            <AyarInput type="text" value={unvan} onChange={(e) => setUnvan(e.target.value)} placeholder="Av., Dr., Prof. vb." />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Kayıtlı Baro">
            <AyarInput type="text" value={baro} onChange={(e) => setBaro(e.target.value)} placeholder="İstanbul Barosu" />
          </FieldGroup>
          <FieldGroup label="Baro Sicil No">
            <AyarInput type="text" value={baroSicil} onChange={(e) => setBaroSicil(e.target.value)} placeholder="Baro sicil numarası" />
          </FieldGroup>
        </div>

        <Separator />

        {/* Uzmanlık Alanları */}
        <SectionTitle sub="Profil kartınızda ve raporlarda gösterilir">Uzmanlık Alanları</SectionTitle>

        <div className="flex flex-wrap gap-1.5">
          {UZMANLIK_ALANLARI.map((alan) => {
            const secili = uzmanliklar.includes(alan);
            return (
              <button
                key={alan}
                type="button"
                onClick={() => toggleUzmanlik(alan)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  secili
                    ? 'bg-gold-dim text-gold border-gold/30'
                    : 'bg-surface2 text-text-muted border-border hover:border-gold/30 hover:text-text'
                }`}
              >
                {secili && '✓ '}{alan}
              </button>
            );
          })}
        </div>

        <Separator />

        {/* Notlar */}
        <FieldGroup label="Profil Notu" hint="Sadece siz ve yöneticiler görebilir">
          <AyarTextarea value={notlar} onChange={(e) => setNotlar(e.target.value)} rows={2} placeholder="Ek notlar..." />
        </FieldGroup>

        <StatusMessage mesaj={mesaj} />
        <SaveButton onClick={kaydet} disabled={yukleniyor} />
      </div>
    </div>
  );
}
