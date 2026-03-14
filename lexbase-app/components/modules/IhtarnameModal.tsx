'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useIhtarnameKaydet, useIhtarnameler, type Ihtarname } from '@/lib/hooks/useIhtarname';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useEtkinlikKaydet } from '@/lib/hooks/useEtkinlikler';
import { useKarsiTaraflar } from '@/lib/hooks/useKarsiTaraflar';

interface IhtarnameModalProps {
  open: boolean;
  onClose: () => void;
  ihtarname?: Ihtarname | null;
}

const bos: Partial<Ihtarname> = {
  muvId: '',
  konu: '',
  tur: 'İhtar',
  yon: 'giden',
  durum: 'Taslak',
  gonderen: '',
  alici: '',
  aliciAdres: '',
  noterAd: '',
  noterNo: '',
  tarih: new Date().toISOString().split('T')[0],
  gonderimTarih: '',
  ucret: 0,
  noterMasrafi: 0,
  tebligDurum: 'Gönderilmedi',
  tebligTarih: '',
  cevapSuresi: 0,
  pttBarkod: '',
  icerik: '',
  cevapTarih: '',
  cevapOzet: '',
};

export function IhtarnameModal({ open, onClose, ihtarname }: IhtarnameModalProps) {
  const [form, setForm] = useState<Partial<Ihtarname>>({ ...bos });
  const [hata, setHata] = useState('');
  const [pttLoading, setPttLoading] = useState(false);
  const [pttSonuc, setPttSonuc] = useState('');
  const kaydet = useIhtarnameKaydet();
  const etkinlikKaydet = useEtkinlikKaydet();
  const { data: muvekkillar } = useMuvekkillar();
  const { data: karsiTaraflar } = useKarsiTaraflar();
  const { data: tumIhtarnameler } = useIhtarnameler();

  /* ── Otomatik numaralama ── */
  const sonrakiNo = useMemo(() => {
    if (!tumIhtarnameler) return 'İHT-2026/001';
    const yil = new Date().getFullYear();
    const prefix = `İHT-${yil}/`;
    const mevcutNolar = tumIhtarnameler
      .filter((i) => !i._silindi && i.no?.startsWith(prefix))
      .map((i) => {
        const sayi = parseInt(i.no!.replace(prefix, ''), 10);
        return isNaN(sayi) ? 0 : sayi;
      });
    const enBuyuk = mevcutNolar.length > 0 ? Math.max(...mevcutNolar) : 0;
    return `${prefix}${String(enBuyuk + 1).padStart(3, '0')}`;
  }, [tumIhtarnameler]);

  /* ── Adres otomatik doldurma için karşı taraf haritası ── */
  const karsiAdresMap = useMemo(() => {
    const map: Record<string, string> = {};
    karsiTaraflar?.forEach((k) => {
      const ad = (k.ad as string) || '';
      const adresRaw = k.adres;
      const adres = typeof adresRaw === 'string' ? adresRaw : (adresRaw as Record<string, string> | undefined)?.tam || '';
      if (ad && adres) map[ad] = adres;
    });
    muvekkillar?.forEach((m) => {
      const adresRaw = m.adres;
      const adres = typeof adresRaw === 'string' ? adresRaw : '';
      if (m.ad && adres) map[m.ad] = adres;
    });
    return map;
  }, [karsiTaraflar, muvekkillar]);

  useEffect(() => {
    if (ihtarname) {
      setForm({ ...ihtarname });
    } else {
      setForm({ ...bos, id: crypto.randomUUID(), no: sonrakiNo });
    }
    setHata('');
    setPttSonuc('');
  }, [ihtarname, open, sonrakiNo]);

  function handleChange(field: string, value: string | number) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Alıcı değiştiğinde adres otomatik doldur
      if (field === 'alici' && typeof value === 'string' && karsiAdresMap[value]) {
        next.aliciAdres = karsiAdresMap[value];
      }
      return next;
    });
  }

  /* ── Süre sonu hesaplama ── */
  const hesaplananSureSonu = useMemo(() => {
    if (!form.tebligTarih || !form.cevapSuresi || form.cevapSuresi <= 0) return '';
    const tarih = new Date(form.tebligTarih);
    tarih.setDate(tarih.getDate() + form.cevapSuresi);
    return tarih.toISOString().split('T')[0];
  }, [form.tebligTarih, form.cevapSuresi]);

  /* ── PTT Barkod Sorgulama ── */
  async function handlePttSorgula() {
    if (!form.pttBarkod?.trim()) {
      setPttSonuc('Lütfen barkod numarası giriniz.');
      return;
    }
    setPttLoading(true);
    setPttSonuc('');
    try {
      const res = await fetch('/api/ptt-sorgula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barkod: form.pttBarkod.trim() }),
      });
      const data = await res.json();
      if (data.durum) {
        setPttSonuc(`${data.durum}${data.tarih ? ` — ${data.tarih}` : ''}`);
        if (data.tebligDurum) {
          setForm((prev) => ({
            ...prev,
            tebligDurum: data.tebligDurum,
            ...(data.tebligTarih ? { tebligTarih: data.tebligTarih } : {}),
            pttSonSorgu: new Date().toISOString(),
            pttSonuc: data.durum,
          }));
        }
      } else {
        setPttSonuc('Otomatik sorgu başarısız. PTT sitesi açılıyor...');
        window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${form.pttBarkod.trim()}`, '_blank');
      }
    } catch {
      setPttSonuc('Bağlantı hatası. PTT sitesi açılıyor...');
      window.open(`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${form.pttBarkod!.trim()}`, '_blank');
    } finally {
      setPttLoading(false);
    }
  }

  /* ── Kaydet + Takvim Entegrasyonu ── */
  async function handleSubmit() {
    if (!form.konu?.trim()) {
      setHata('Konu zorunludur.');
      return;
    }
    setHata('');

    const sureSonu = hesaplananSureSonu;
    const kayitForm = { ...form, sureSonu } as Ihtarname;

    try {
      await kaydet.mutateAsync(kayitForm);

      // Takvim entegrasyonu
      if (sureSonu && form.cevapSuresi && form.cevapSuresi > 0) {
        await etkinlikKaydet.mutateAsync({
          id: crypto.randomUUID(),
          baslik: `⚠️ ${form.konu} - Cevap Süresi Doluyor`,
          tarih: sureSonu,
          saat: '09:00',
          tur: 'Son Gün',
          muvId: form.muvId || '',
          not: `İhtarname cevap süresi son günü. No: ${form.no || '—'}, Alıcı: ${form.alici || '—'}`,
          hatirlatma: '1gun',
        });
      }

      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  /* ── Cevap bölümü gösterilecek mi? ── */
  const cevapGosterilecek = form.durum === 'Cevap Geldi' || form.durum === 'Sonuçlandı';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ihtarname ? 'İhtarname Düzenle' : 'Yeni İhtarname'}
      maxWidth="max-w-3xl"
      footer={
        <>
          <BtnOutline onClick={onClose}>İptal</BtnOutline>
          <BtnGold onClick={handleSubmit} disabled={kaydet.isPending}>
            {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
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

        {/* ── Temel Bilgiler ── */}
        <div className="grid grid-cols-3 gap-4">
          <FormGroup label="İhtarname No">
            <FormInput value={form.no || ''} onChange={(e) => handleChange('no', e.target.value)} placeholder="İHT-2026/001" />
          </FormGroup>
          <FormGroup label="İhtarname Türü">
            <FormSelect value={form.tur || ''} onChange={(e) => handleChange('tur', e.target.value)}>
              <option value="İhtar">İhtar</option>
              <option value="İhbarname">İhbarname</option>
              <option value="Fesih İhtarı">Fesih İhtarı</option>
              <option value="Ödeme İhtarı">Ödeme İhtarı</option>
              <option value="Tahliye İhtarı">Tahliye İhtarı</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="Yön">
            <FormSelect value={form.yon || 'giden'} onChange={(e) => handleChange('yon', e.target.value)}>
              <option value="giden">📤 Giden</option>
              <option value="gelen">📥 Gelen</option>
            </FormSelect>
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Müvekkil">
            <FormSelect value={form.muvId || ''} onChange={(e) => handleChange('muvId', e.target.value)}>
              <option value="">Seçiniz</option>
              {muvekkillar?.map((m) => (
                <option key={m.id} value={m.id}>{m.ad}</option>
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Durum">
            <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
              <option value="Taslak">Taslak</option>
              <option value="Hazırlandı">Hazırlandı</option>
              <option value="Gönderildi">Gönderildi</option>
              <option value="Tebliğ Edildi">Tebliğ Edildi</option>
              <option value="Cevap Geldi">Cevap Geldi</option>
              <option value="Sonuçlandı">Sonuçlandı</option>
            </FormSelect>
          </FormGroup>
        </div>

        <FormGroup label="Konu" required>
          <FormInput value={form.konu || ''} onChange={(e) => handleChange('konu', e.target.value)} placeholder="İhtarname konusu" />
        </FormGroup>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Gönderen">
            <FormInput value={form.gonderen || ''} onChange={(e) => handleChange('gonderen', e.target.value)} placeholder="Gönderen ad/unvan" />
          </FormGroup>
          <FormGroup label="Alıcı">
            <FormInput
              value={form.alici || ''}
              onChange={(e) => handleChange('alici', e.target.value)}
              placeholder="Alıcı ad/unvan"
              list="alici-list"
            />
            <datalist id="alici-list">
              {karsiTaraflar?.map((k) => (
                <option key={k.id} value={(k.ad as string) || ''} />
              ))}
              {muvekkillar?.map((m) => (
                <option key={m.id} value={m.ad || ''} />
              ))}
            </datalist>
          </FormGroup>
        </div>

        <FormGroup label="Alıcı Adresi">
          <FormTextarea value={form.aliciAdres || ''} onChange={(e) => handleChange('aliciAdres', e.target.value)} rows={2} placeholder="Alıcı açık adresi" />
        </FormGroup>

        {/* ── Tarih & Noter ── */}
        <div className="grid grid-cols-4 gap-4">
          <FormGroup label="Düzenleme Tarihi">
            <FormInput type="date" value={form.tarih || ''} onChange={(e) => handleChange('tarih', e.target.value)} />
          </FormGroup>
          <FormGroup label="Gönderim Tarihi">
            <FormInput type="date" value={form.gonderimTarih || ''} onChange={(e) => handleChange('gonderimTarih', e.target.value)} />
          </FormGroup>
          <FormGroup label="Noter Adı">
            <FormInput value={form.noterAd || ''} onChange={(e) => handleChange('noterAd', e.target.value)} placeholder="Noter adı" />
          </FormGroup>
          <FormGroup label="Noter Yevmiye No">
            <FormInput value={form.noterNo || ''} onChange={(e) => handleChange('noterNo', e.target.value)} placeholder="Yevmiye numarası" />
          </FormGroup>
        </div>

        {/* ── İçerik / Metin ── */}
        <FormGroup label="İhtarname Metni / İçerik">
          <FormTextarea
            value={form.icerik || ''}
            onChange={(e) => handleChange('icerik', e.target.value)}
            rows={5}
            placeholder="İhtarname metin içeriğini buraya giriniz veya kopyalayınız..."
          />
        </FormGroup>

        {/* ── Tebliğ & Süre Takibi ── */}
        <div className="border border-border rounded-lg p-4 bg-surface2/30 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span>📬</span> Tebliğ & Süre Takibi
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormGroup label="Tebliğ Durumu">
              <FormSelect value={form.tebligDurum || 'Gönderilmedi'} onChange={(e) => handleChange('tebligDurum', e.target.value)}>
                <option value="Gönderilmedi">Gönderilmedi</option>
                <option value="PTT'de Bekliyor">PTT&apos;de Bekliyor</option>
                <option value="Tebliğ Edildi">Tebliğ Edildi</option>
                <option value="İade Döndü">İade Döndü</option>
              </FormSelect>
            </FormGroup>
            <FormGroup label="Tebliğ Tarihi">
              <FormInput
                type="date"
                value={form.tebligTarih || ''}
                onChange={(e) => handleChange('tebligTarih', e.target.value)}
                disabled={form.tebligDurum !== 'Tebliğ Edildi'}
              />
            </FormGroup>
            <FormGroup label="Cevap Süresi (Gün)">
              <FormInput
                type="number"
                value={form.cevapSuresi || ''}
                onChange={(e) => handleChange('cevapSuresi', Number(e.target.value))}
                placeholder="Ör: 7, 15, 30"
              />
            </FormGroup>
          </div>

          {hesaplananSureSonu && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gold-dim border border-gold/20 rounded-lg">
              <span className="text-sm">⏰</span>
              <span className="text-xs text-gold font-semibold">
                Cevap Son Tarihi: {new Date(hesaplananSureSonu).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[10px] text-text-muted ml-auto">Takvime otomatik eklenecek</span>
            </div>
          )}
        </div>

        {/* ── Cevap Bilgileri (durum Cevap Geldi veya Sonuçlandı ise) ── */}
        {cevapGosterilecek && (
          <div className="border border-green/20 rounded-lg p-4 bg-green-dim/30 space-y-3">
            <div className="text-xs font-bold text-green uppercase tracking-wider flex items-center gap-1.5">
              <span>💬</span> Cevap Bilgileri
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormGroup label="Cevap Tarihi">
                <FormInput type="date" value={form.cevapTarih || ''} onChange={(e) => handleChange('cevapTarih', e.target.value)} />
              </FormGroup>
              <div />
            </div>
            <FormGroup label="Cevap Özeti">
              <FormTextarea
                value={form.cevapOzet || ''}
                onChange={(e) => handleChange('cevapOzet', e.target.value)}
                rows={3}
                placeholder="Gelen cevabın kısa özeti..."
              />
            </FormGroup>
          </div>
        )}

        {/* ── PTT Barkod Sorgulama ── */}
        <div className="border border-border rounded-lg p-4 bg-surface2/30 space-y-3">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <span>📦</span> PTT Gönderi Takip
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <FormGroup label="PTT Barkod No">
                <FormInput
                  value={form.pttBarkod || ''}
                  onChange={(e) => handleChange('pttBarkod', e.target.value)}
                  placeholder="RR123456789TR"
                />
              </FormGroup>
            </div>
            <button
              onClick={handlePttSorgula}
              disabled={pttLoading || !form.pttBarkod?.trim()}
              className="px-4 py-2.5 bg-[#E30613] text-white text-xs font-bold rounded-lg hover:bg-[#c00510] disabled:opacity-40 transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              {pttLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <span>📦</span>
              )}
              {pttLoading ? 'Sorgulanıyor...' : 'PTT\'den Sorgula'}
            </button>
          </div>

          {pttSonuc && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${
              pttSonuc.includes('Tebliğ Edildi') ? 'bg-green-dim border-green/20 text-green' :
              pttSonuc.includes('İade') ? 'bg-red-dim border-red/20 text-red' :
              pttSonuc.includes('hata') || pttSonuc.includes('başarısız') ? 'bg-orange-400/10 border-orange-400/20 text-orange-400' :
              'bg-blue-400/10 border-blue-400/20 text-blue-400'
            }`}>
              📬 {pttSonuc}
            </div>
          )}

          {form.pttSonSorgu && (
            <div className="text-[10px] text-text-dim">
              Son sorgu: {new Date(form.pttSonSorgu).toLocaleString('tr-TR')}
              {form.pttSonuc && ` — ${form.pttSonuc}`}
            </div>
          )}
        </div>

        {/* ── Ücretler ── */}
        <div className="grid grid-cols-3 gap-4">
          <FormGroup label="Ücret (TL)">
            <FormInput type="number" value={form.ucret || ''} onChange={(e) => handleChange('ucret', Number(e.target.value))} placeholder="0" />
          </FormGroup>
          <FormGroup label="Noter Masrafı (TL)">
            <FormInput type="number" value={form.noterMasrafi || ''} onChange={(e) => handleChange('noterMasrafi', Number(e.target.value))} placeholder="0" />
          </FormGroup>
          <FormGroup label="Tahsil Edilen (TL)">
            <FormInput type="number" value={form.tahsilEdildi || ''} onChange={(e) => handleChange('tahsilEdildi', Number(e.target.value))} placeholder="0" />
          </FormGroup>
        </div>
      </div>
    </Modal>
  );
}
