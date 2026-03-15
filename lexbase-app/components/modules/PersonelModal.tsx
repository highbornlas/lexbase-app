'use client';

import { useState, useEffect } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { usePersonelKaydet, type Personel } from '@/lib/hooks/usePersonel';
import { createClient } from '@/lib/supabase/client';

interface PersonelModalProps {
  open: boolean;
  onClose: () => void;
  personel?: Personel | null;
}

const bos: Partial<Personel> = {
  ad: '',
  rol: 'avukat',
  email: '',
  tel: '',
  tc: '',
  baroSicil: '',
  baslama: new Date().toISOString().split('T')[0],
  durum: 'aktif',
  notlar: '',
};

export function PersonelModal({ open, onClose, personel }: PersonelModalProps) {
  const [form, setForm] = useState<Partial<Personel>>({ ...bos });
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [davetGonder, setDavetGonder] = useState(false);
  const kaydet = usePersonelKaydet();

  const yeniKayit = !personel;

  useEffect(() => {
    if (personel) {
      setForm({ ...personel });
      setDavetGonder(false);
    } else {
      setForm({ ...bos, id: crypto.randomUUID() });
      setDavetGonder(true); // Yeni personel eklerken varsayılan olarak davet gönder
    }
    setHata('');
    setBilgi('');
  }, [personel, open]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.ad?.trim()) {
      setHata('Ad Soyad zorunludur.');
      return;
    }

    setHata('');
    setBilgi('');
    setYukleniyor(true);

    try {
      // 1. Personel tablosuna kaydet (her durumda)
      const personelData = {
        ...form,
        durum: davetGonder && yeniKayit && form.email ? 'davet_gonderildi' : form.durum,
      } as Personel;

      await kaydet.mutateAsync(personelData);

      // 2. E-posta varsa ve davet gönder seçiliyse → Edge Function çağır
      if (davetGonder && form.email?.trim() && yeniKayit) {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setHata('Davet göndermek için oturum gerekli.');
          setYukleniyor(false);
          return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            ad: form.ad.trim(),
            rol: form.rol || 'avukat',
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          // Personel kaydı yapıldı ama davet gönderilemedi
          if (result.error?.includes('zaten kayıtlı')) {
            setBilgi('Personel kaydedildi. Bu e-posta zaten sistemde kayıtlı olduğundan davet gönderilmedi.');
          } else {
            setBilgi(`Personel kaydedildi ancak davet gönderilemedi: ${result.error || 'Bilinmeyen hata'}`);
          }
          setYukleniyor(false);
          setTimeout(() => onClose(), 2500);
          return;
        }

        setBilgi(result.message || 'Davet gönderildi!');
        setYukleniyor(false);
        setTimeout(() => onClose(), 1500);
        return;
      }

      // Davet gönderilmeden sadece kayıt
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
    setYukleniyor(false);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={personel ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
      maxWidth="max-w-xl"
      footer={
        <>
          <BtnOutline onClick={onClose}>İptal</BtnOutline>
          <BtnGold onClick={handleSubmit} disabled={yukleniyor || kaydet.isPending}>
            {yukleniyor ? 'İşleniyor...' : personel ? 'Kaydet' : (davetGonder && form.email ? 'Kaydet ve Davet Gönder' : 'Kaydet')}
          </BtnGold>
        </>
      }
    >
      <div className="space-y-4">
        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red">
            {hata}
          </div>
        )}
        {bilgi && (
          <div className="bg-green-dim border border-green/20 rounded-[10px] px-3 py-2 text-xs text-green">
            {bilgi}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Ad Soyad" required>
            <FormInput value={form.ad || ''} onChange={(e) => handleChange('ad', e.target.value)} placeholder="Personel adı" />
          </FormGroup>
          <FormGroup label="Rol">
            <FormSelect value={form.rol || ''} onChange={(e) => handleChange('rol', e.target.value)}>
              <option value="avukat">Avukat</option>
              <option value="stajyer">Stajyer</option>
              <option value="sekreter">Sekreter</option>
            </FormSelect>
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label={yeniKayit ? 'E-posta (giriş adresi)' : 'E-posta'}>
            <FormInput
              type="email"
              value={form.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="ornek@mail.com"
              disabled={!yeniKayit && form.durum !== 'aktif'}
            />
          </FormGroup>
          <FormGroup label="Telefon">
            <FormInput type="tel" value={form.tel || ''} onChange={(e) => handleChange('tel', e.target.value)} placeholder="0532 000 0000" />
          </FormGroup>
        </div>

        {/* Davet gönderme seçeneği — sadece yeni kayıtta ve e-posta varken */}
        {yeniKayit && form.email?.trim() && (
          <div className="bg-surface2 border border-border/50 rounded-lg p-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                  davetGonder ? 'bg-gold' : 'bg-border'
                }`}
                onClick={() => setDavetGonder(!davetGonder)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    davetGonder ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-text group-hover:text-gold transition-colors">
                  Davet e-postası gönder
                </div>
                <div className="text-[10px] text-text-dim">
                  {davetGonder
                    ? 'Bu kişiye sisteme giriş yapması için bir davet e-postası gönderilecek'
                    : 'Sadece personel kaydı oluşturulacak, giriş daveti gönderilmeyecek'}
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="TC Kimlik No">
            <FormInput value={form.tc || ''} onChange={(e) => handleChange('tc', e.target.value)} placeholder="11 haneli TC" maxLength={11} />
          </FormGroup>
          <FormGroup label="Baro Sicil No">
            <FormInput value={form.baroSicil || ''} onChange={(e) => handleChange('baroSicil', e.target.value)} placeholder="Baro sicil numarası" />
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Başlama Tarihi">
            <FormInput type="date" value={form.baslama || ''} onChange={(e) => handleChange('baslama', e.target.value)} />
          </FormGroup>
          {!yeniKayit && (
            <FormGroup label="Durum">
              <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="davet_gonderildi">Davet Gönderildi</option>
                <option value="pasif">Pasif</option>
              </FormSelect>
            </FormGroup>
          )}
        </div>

        <FormGroup label="Notlar">
          <FormTextarea value={form.notlar || ''} onChange={(e) => handleChange('notlar', e.target.value)} rows={2} placeholder="Ek notlar..." />
        </FormGroup>
      </div>
    </Modal>
  );
}
