'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useKullanici } from '@/lib/hooks/useBuro';
import { useYetki } from '@/lib/hooks/useRol';
import { SectionTitle, FieldGroup, AyarInput, AyarTextarea, StatusMessage, SaveButton, Separator } from './shared';

/* ══════════════════════════════════════════════════════════════
   Büro Bilgileri Tab — Büro detayları, vergi no, IBAN, adres
   ══════════════════════════════════════════════════════════════ */

export function BuroBilgileriTab() {
  const kullanici = useKullanici();
  const { yetkili } = useYetki('ayarlar:duzenle');

  const [buroAd, setBuroAd] = useState('');
  const [buroTel, setBuroTel] = useState('');
  const [buroMail, setBuroMail] = useState('');
  const [buroAdres, setBuroAdres] = useState('');
  const [vergiDairesi, setVergiDairesi] = useState('');
  const [vergiNo, setVergiNo] = useState('');
  const [iban, setIban] = useState('');
  const [bankaAd, setBankaAd] = useState('');
  const [webSitesi, setWebSitesi] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (!kullanici) return;
    const buroId = kullanici.buro_id as string;
    if (!buroId) return;

    const supabase = createClient();
    (async () => {
      const { data } = await supabase.from('burolar').select('*').eq('id', buroId).single();
      if (data) {
        setBuroAd((data.ad as string) || '');
        setBuroTel((data.tel as string) || '');
        setBuroMail((data.mail as string) || '');
        setBuroAdres((data.adres as string) || '');
        setVergiDairesi((data.vergi_dairesi as string) || '');
        setVergiNo((data.vergi_no as string) || '');
        setIban((data.iban as string) || '');
        setBankaAd((data.banka_ad as string) || '');
        setWebSitesi((data.web_sitesi as string) || '');
      }
    })();
  }, [kullanici]);

  const kaydet = async () => {
    if (!buroAd.trim()) { setMesaj('Büro adı zorunludur.'); return; }
    setYukleniyor(true);
    setMesaj('');
    try {
      const supabase = createClient();
      const buroId = kullanici?.buro_id as string;
      if (!buroId) throw new Error('Büro bulunamadı');

      await supabase
        .from('burolar')
        .update({
          ad: buroAd.trim(),
          tel: buroTel.trim(),
          mail: buroMail.trim(),
          adres: buroAdres.trim(),
          vergi_dairesi: vergiDairesi.trim(),
          vergi_no: vergiNo.trim(),
          iban: iban.trim().replace(/\s/g, ''),
          banka_ad: bankaAd.trim(),
          web_sitesi: webSitesi.trim(),
        })
        .eq('id', buroId);

      setMesaj('Büro bilgileri güncellendi.');
    } catch {
      setMesaj('Hata oluştu.');
    }
    setYukleniyor(false);
  };

  if (!yetkili) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-2">🔒</div>
        <p className="text-sm text-text-muted">Büro bilgilerini düzenleme yetkiniz yok</p>
        <p className="text-[11px] text-text-dim mt-1">Bu sayfa yalnızca yöneticiler tarafından düzenlenebilir</p>
      </div>
    );
  }

  return (
    <div>
      <SectionTitle sub="Büronuzun genel bilgileri, resmi belgeler ve iletişim">Büro Bilgileri</SectionTitle>

      <div className="space-y-4 max-w-lg">
        {/* Temel Bilgiler */}
        <FieldGroup label="Büro Adı" required>
          <AyarInput type="text" value={buroAd} onChange={(e) => setBuroAd(e.target.value)} placeholder="Hukuk bürosu adı" />
        </FieldGroup>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Telefon">
            <AyarInput type="tel" value={buroTel} onChange={(e) => setBuroTel(e.target.value)} placeholder="0212 000 0000" />
          </FieldGroup>
          <FieldGroup label="E-posta">
            <AyarInput type="email" value={buroMail} onChange={(e) => setBuroMail(e.target.value)} placeholder="info@buronuz.com" />
          </FieldGroup>
        </div>

        <FieldGroup label="Web Sitesi">
          <AyarInput type="url" value={webSitesi} onChange={(e) => setWebSitesi(e.target.value)} placeholder="https://www.buronuz.com" />
        </FieldGroup>

        <FieldGroup label="Adres">
          <AyarTextarea value={buroAdres} onChange={(e) => setBuroAdres(e.target.value)} rows={2} placeholder="Büro adresi" />
        </FieldGroup>

        <Separator />

        {/* Vergi & Mali Bilgiler */}
        <SectionTitle sub="Fatura ve mali işlemler için kullanılır">Vergi & Mali Bilgiler</SectionTitle>

        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Vergi Dairesi">
            <AyarInput type="text" value={vergiDairesi} onChange={(e) => setVergiDairesi(e.target.value)} placeholder="Vergi dairesi adı" />
          </FieldGroup>
          <FieldGroup label="Vergi No">
            <AyarInput
              type="text"
              value={vergiNo}
              onChange={(e) => setVergiNo(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="Vergi / TC numarası"
              maxLength={11}
            />
          </FieldGroup>
        </div>

        <FieldGroup label="Banka Adı">
          <AyarInput type="text" value={bankaAd} onChange={(e) => setBankaAd(e.target.value)} placeholder="Banka adı" />
        </FieldGroup>

        <FieldGroup label="IBAN" hint="TR ile başlayan 26 haneli IBAN numaranız">
          <AyarInput
            type="text"
            value={iban}
            onChange={(e) => setIban(e.target.value.toUpperCase())}
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            maxLength={32}
          />
        </FieldGroup>

        <StatusMessage mesaj={mesaj} />
        <SaveButton onClick={kaydet} disabled={yukleniyor} />
      </div>
    </div>
  );
}
