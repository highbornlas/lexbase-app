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
  // Mevcut personel daveti başarısız olmuşsa tekrar gönderebilsin
  const davetBekliyor = !yeniKayit && personel?.durum === 'davet_gonderildi';
  const davetGosterilebilir = (yeniKayit || davetBekliyor) && !!form.email?.trim();

  useEffect(() => {
    if (personel) {
      setForm({ ...personel });
      setDavetGonder(personel.durum === 'davet_gonderildi'); // Bekleyen davet varsa otomatik seç
    } else {
      setForm({ ...bos, id: crypto.randomUUID() });
      setDavetGonder(true);
    }
    setHata('');
    setBilgi('');
  }, [personel, open]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function davetGonderFn() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setHata('Davet göndermek için oturum gerekli.');
      return false;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: form.email!.trim(),
        ad: form.ad!.trim(),
        rol: form.rol || 'avukat',
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      const errorMsg = result.error || 'Bilinmeyen hata';
      if (errorMsg.includes('zaten') && errorMsg.includes('kayıtlı')) {
        setBilgi('Bu e-posta zaten bu büroda kayıtlı.');
      } else {
        setBilgi(`Davet gönderilemedi: ${errorMsg}`);
      }
      return false;
    }

    // Başarılı senaryolar
    if (result.status === 'already_member') {
      setBilgi(`${form.email} zaten bu büroda üye.`);
    } else if (result.status === 'existing_user_added') {
      setBilgi(result.message || 'Mevcut kullanıcı büronuza eklendi. Bildirim gönderildi.');
    } else if (result.status === 'reactivated') {
      setBilgi(result.message || 'Üyelik tekrar aktifleştirildi.');
    } else {
      setBilgi(result.message || 'Davet gönderildi!');
    }
    return true;
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
      // 1. Personel tablosuna kaydet
      const personelData = {
        ...form,
        durum: davetGonder && (yeniKayit || davetBekliyor) && form.email
          ? 'davet_gonderildi'
          : form.durum,
      } as Personel;

      await kaydet.mutateAsync(personelData);

      // 2. Davet gönder
      if (davetGonder && form.email?.trim()) {
        const basarili = await davetGonderFn();
        setYukleniyor(false);

        if (basarili) {
          // Başarılı → durum 'davet_gonderildi' olarak kalır (davet kabul edildiğinde aktif olur)
          // Zaten personelData.durum = 'davet_gonderildi' olarak ayarlandı
        }
        // Başarısız → durum güncellenmez, mevcut haliyle kalır

        setTimeout(() => onClose(), 2000);
        return;
      }

      // Davet gönderilmeden kayıt
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
    setYukleniyor(false);
  }

  // Buton label
  const butonLabel = yukleniyor
    ? 'İşleniyor...'
    : davetGonder && form.email?.trim()
      ? (yeniKayit ? 'Kaydet ve Davet Gönder' : 'Kaydet ve Daveti Tekrarla')
      : 'Kaydet';

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
            {butonLabel}
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
              <option value="yonetici">Yönetici</option>
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
            />
          </FormGroup>
          <FormGroup label="Telefon">
            <FormInput type="tel" value={form.tel || ''} onChange={(e) => handleChange('tel', e.target.value)} placeholder="0532 000 0000" />
          </FormGroup>
        </div>

        {/* Davet toggle — yeni kayıt VEYA davet bekleyen mevcut personel */}
        {davetGosterilebilir && (
          <div className={`border rounded-lg p-3 ${davetBekliyor ? 'bg-gold-dim/30 border-gold/30' : 'bg-surface2 border-border/50'}`}>
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
                  {davetBekliyor ? 'Daveti tekrar gönder' : 'Davet e-postası gönder'}
                </div>
                <div className="text-[10px] text-text-dim">
                  {davetBekliyor
                    ? 'Önceki davet başarısız olmuş olabilir. Tekrar göndermek için aktif bırakın.'
                    : davetGonder
                      ? 'Bu kişiye sisteme giriş yapması için bir davet e-postası gönderilecek'
                      : 'Sadece personel kaydı oluşturulacak, giriş daveti gönderilmeyecek'
                  }
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
          {!yeniKayit && !davetBekliyor && (
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
