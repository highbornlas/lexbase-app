'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { telefonDogrula, telefonFormatla, epostaDogrula } from '@/lib/validation';

/* ══════════════════════════════════════════════════════════════
   CSV/Excel İçe Aktarma Sihirbazı
   3 adım: Dosya Yükle → Sütun Eşleştir → Önizle & Aktar
   ══════════════════════════════════════════════════════════════ */

type HedefTip = 'muvekkil' | 'karsiTaraf' | 'vekil' | 'dava' | 'icra';
type Adim = 'yukle' | 'eslestir' | 'onizle';

// ── Hedef alan tanımları ──
const MUVEKKIL_ALANLARI: { key: string; label: string; zorunlu?: boolean }[] = [
  { key: 'ad', label: 'Ad', zorunlu: true },
  { key: 'soyad', label: 'Soyad' },
  { key: 'tip', label: 'Tip (gercek/tuzel)' },
  { key: 'tc', label: 'TC Kimlik No' },
  { key: 'yabanciKimlikNo', label: 'Yabancı Kimlik No' },
  { key: 'dogum', label: 'Doğum Tarihi' },
  { key: 'uyruk', label: 'Uyruk' },
  { key: 'meslek', label: 'Meslek' },
  { key: 'unvan', label: 'Ünvan (Tüzel)' },
  { key: 'vergiNo', label: 'Vergi No' },
  { key: 'vergiDairesi', label: 'Vergi Dairesi' },
  { key: 'mersis', label: 'MERSİS No' },
  { key: 'tel', label: 'Telefon' },
  { key: 'mail', label: 'E-posta' },
  { key: 'faks', label: 'Faks' },
  { key: 'uets', label: 'UETS No' },
];

const KARSI_TARAF_ALANLARI: { key: string; label: string; zorunlu?: boolean }[] = [
  { key: 'ad', label: 'Ad', zorunlu: true },
  { key: 'soyad', label: 'Soyad' },
  { key: 'tip', label: 'Tip (gercek/tuzel)' },
  { key: 'tc', label: 'TC Kimlik No' },
  { key: 'vergiNo', label: 'Vergi No' },
  { key: 'vergiDairesi', label: 'Vergi Dairesi' },
  { key: 'tel', label: 'Telefon' },
  { key: 'mail', label: 'E-posta' },
  { key: 'uets', label: 'UETS No' },
];

const VEKIL_ALANLARI: { key: string; label: string; zorunlu?: boolean }[] = [
  { key: 'ad', label: 'Ad', zorunlu: true },
  { key: 'soyad', label: 'Soyad' },
  { key: 'baro', label: 'Baro' },
  { key: 'baroSicil', label: 'Baro Sicil No' },
  { key: 'tbbSicil', label: 'TBB Sicil No' },
  { key: 'tel', label: 'Telefon' },
  { key: 'mail', label: 'E-posta' },
  { key: 'uets', label: 'UETS No' },
];

const DAVA_ALANLARI: { key: string; label: string; zorunlu?: boolean }[] = [
  { key: 'konu', label: 'Dava Konusu', zorunlu: true },
  { key: 'davaTuru', label: 'Dava Türü' },
  { key: 'esasYil', label: 'Esas Yılı' },
  { key: 'esasNo', label: 'Esas No' },
  { key: 'il', label: 'İl' },
  { key: 'adliye', label: 'Adliye' },
  { key: 'mtur', label: 'Mahkeme Türü' },
  { key: 'mno', label: 'Mahkeme No' },
  { key: 'asama', label: 'Aşama' },
  { key: 'durum', label: 'Durum' },
  { key: 'taraf', label: 'Taraf (davaci/davali)' },
  { key: 'tarih', label: 'Dava Tarihi' },
  { key: 'durusma', label: 'Duruşma Tarihi' },
  { key: 'deger', label: 'Dava Değeri' },
  { key: 'karsi', label: 'Karşı Taraf' },
  { key: 'not', label: 'Notlar' },
];

const ICRA_ALANLARI: { key: string; label: string; zorunlu?: boolean }[] = [
  { key: 'borclu', label: 'Borçlu', zorunlu: true },
  { key: 'btc', label: 'Borçlu TC/VKN' },
  { key: 'tur', label: 'Takip Türü' },
  { key: 'atur', label: 'Alacak Türü' },
  { key: 'esasYil', label: 'Esas Yılı' },
  { key: 'esasNo', label: 'Esas No' },
  { key: 'il', label: 'İl' },
  { key: 'adliye', label: 'Adliye' },
  { key: 'daire', label: 'İcra Dairesi' },
  { key: 'durum', label: 'Durum' },
  { key: 'alacak', label: 'Alacak Tutarı' },
  { key: 'tarih', label: 'Takip Tarihi' },
  { key: 'otarih', label: 'Ödeme Emri Tarihi' },
  { key: 'dayanak', label: 'Dayanak' },
  { key: 'karsi', label: 'Karşı Taraf' },
  { key: 'not', label: 'Notlar' },
];

function alanlarByTip(tip: HedefTip) {
  switch (tip) {
    case 'muvekkil': return MUVEKKIL_ALANLARI;
    case 'karsiTaraf': return KARSI_TARAF_ALANLARI;
    case 'vekil': return VEKIL_ALANLARI;
    case 'dava': return DAVA_ALANLARI;
    case 'icra': return ICRA_ALANLARI;
  }
}

// ── CSV Parser ──
function parseCSV(text: string): { basliklar: string[]; satirlar: string[][] } {
  const satirlar = text.split(/\r?\n/).filter((s) => s.trim());
  if (satirlar.length < 2) return { basliklar: [], satirlar: [] };

  // Ayırıcı otomatik tespit (virgül, noktalı virgül, tab)
  const ilkSatir = satirlar[0];
  const separators = [',', ';', '\t'];
  let sep = ',';
  let maxCount = 0;
  for (const s of separators) {
    const count = (ilkSatir.match(new RegExp(s === '\t' ? '\t' : `\\${s}`, 'g')) || []).length;
    if (count > maxCount) { maxCount = count; sep = s; }
  }

  function parseSatir(satir: string): string[] {
    const sonuc: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < satir.length; i++) {
      const ch = satir[i];
      if (ch === '"') {
        if (inQuotes && satir[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === sep && !inQuotes) {
        sonuc.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    sonuc.push(current.trim());
    return sonuc;
  }

  const basliklar = parseSatir(satirlar[0]);
  const veriSatirlari = satirlar.slice(1).map(parseSatir);
  return { basliklar, satirlar: veriSatirlari };
}

// ── Otomatik sütun eşleştirme ──
function otomatikEslestir(basliklar: string[], hedefAlanlar: { key: string; label: string }[]): Record<number, string> {
  const eslestirme: Record<number, string> = {};
  const kullanilan = new Set<string>();

  const aliases: Record<string, string[]> = {
    ad: ['ad', 'adı', 'isim', 'name', 'first name', 'firstname', 'ad soyad'],
    soyad: ['soyad', 'soyadı', 'surname', 'last name', 'lastname'],
    tc: ['tc', 'tc kimlik', 'tckn', 'kimlik no', 'tc no'],
    tel: ['tel', 'telefon', 'phone', 'gsm', 'cep', 'cep tel'],
    mail: ['mail', 'email', 'e-posta', 'eposta'],
    baro: ['baro', 'barosu'],
    baroSicil: ['baro sicil', 'sicil no', 'sicil'],
    tbbSicil: ['tbb', 'tbb sicil'],
    vergiNo: ['vergi no', 'vkn', 'vergi kimlik'],
    vergiDairesi: ['vergi dairesi'],
    mersis: ['mersis', 'mersis no'],
    uets: ['uets', 'uets no'],
    meslek: ['meslek'],
    uyruk: ['uyruk', 'tabiiyet'],
    dogum: ['doğum', 'dogum', 'doğum tarihi'],
    tip: ['tip', 'tür', 'tur', 'kişi tipi'],
    unvan: ['ünvan', 'unvan', 'şirket adı'],
    faks: ['faks', 'fax'],
    // UYAP Dava alanları
    konu: ['konu', 'dava konusu', 'konu/açıklama'],
    davaTuru: ['dava türü', 'dava turu', 'dosya türü'],
    esasYil: ['esas yılı', 'esas yili', 'yıl'],
    esasNo: ['esas no', 'esas sıra', 'esas sira', 'sıra no'],
    il: ['il', 'şehir', 'sehir'],
    adliye: ['adliye', 'adliye adı'],
    mtur: ['mahkeme türü', 'mahkeme turu', 'mahkeme tipi'],
    mno: ['mahkeme no', 'mahkeme numarası'],
    asama: ['aşama', 'asama', 'derece'],
    durum: ['durum', 'dosya durumu', 'status'],
    taraf: ['taraf', 'müvekkil tarafı', 'davacı/davalı'],
    tarih: ['tarih', 'dava tarihi', 'takip tarihi', 'açılış tarihi'],
    durusma: ['duruşma', 'durusma', 'duruşma tarihi', 'sonraki duruşma'],
    deger: ['dava değeri', 'deger', 'değer', 'tutar'],
    karsi: ['karşı taraf', 'karsi taraf', 'davalı', 'davacı'],
    // UYAP İcra alanları
    borclu: ['borçlu', 'borclu', 'borçlu adı'],
    btc: ['borçlu tc', 'borclu tc', 'borçlu vkn'],
    tur: ['takip türü', 'takip turu', 'icra türü'],
    atur: ['alacak türü', 'alacak turu'],
    daire: ['daire', 'icra dairesi', 'icra müdürlüğü'],
    alacak: ['alacak', 'alacak tutarı', 'toplam alacak'],
    otarih: ['ödeme emri', 'ödeme emri tarihi'],
    dayanak: ['dayanak', 'dayanak belge'],
  };

  for (let i = 0; i < basliklar.length; i++) {
    const lower = basliklar[i].toLowerCase().trim();
    for (const alan of hedefAlanlar) {
      if (kullanilan.has(alan.key)) continue;
      const alanAliases = aliases[alan.key] || [alan.key.toLowerCase()];
      if (alanAliases.some((a) => lower === a || lower.includes(a))) {
        eslestirme[i] = alan.key;
        kullanilan.add(alan.key);
        break;
      }
    }
  }
  return eslestirme;
}

// ── Doğrulama sonuç tipi ──
interface DogrulamaHatasi {
  satir: number;
  alan: string;
  mesaj: string;
}

interface IslenmisSatir {
  data: Record<string, string>;
  hatalar: DogrulamaHatasi[];
  mukerrer: boolean;
}

// ── Props ──
interface IceAktarmaModalProps {
  open: boolean;
  onClose: () => void;
  hedefTip: HedefTip;
  mevcutKayitlar: Array<Record<string, unknown>>;
  onAktar: (kayitlar: Record<string, string>[]) => Promise<void>;
}

export function IceAktarmaModal({ open, onClose, hedefTip, mevcutKayitlar, onAktar }: IceAktarmaModalProps) {
  const [adim, setAdim] = useState<Adim>('yukle');
  const [basliklar, setBasliklar] = useState<string[]>([]);
  const [satirlar, setSatirlar] = useState<string[][]>([]);
  const [eslestirme, setEslestirme] = useState<Record<number, string>>({});
  const [yuklemeDurum, setYuklemeDurum] = useState<'bos' | 'yukleniyor' | 'basarili' | 'hata'>('bos');
  const [hataMsg, setHataMsg] = useState('');
  const [aktarimDurum, setAktarimDurum] = useState<'hazir' | 'aktariliyor' | 'bitti'>('hazir');
  const [aktarimSonuc, setAktarimSonuc] = useState<{ basarili: number; hata: number } | null>(null);
  const [mukerrerHaric, setMukerrerHaric] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const iceAktarmaForm = useMemo(() => ({ adim, eslestirme: JSON.stringify(eslestirme), mukerrerHaric }), [adim, eslestirme, mukerrerHaric]);
  const iceAktarmaInitial = useMemo(() => ({ adim: 'yukle' as Adim, eslestirme: '{}', mukerrerHaric: true }), []);
  const draftKey = 'iceAktarma';
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, iceAktarmaForm as Record<string, unknown>, iceAktarmaInitial as Record<string, unknown>, open
  );

  const hedefAlanlar = alanlarByTip(hedefTip);

  // ── Dosya oku ──
  const handleDosya = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setYuklemeDurum('yukleniyor');
    setHataMsg('');

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'tsv', 'txt'].includes(ext || '')) {
        setHataMsg('Desteklenen formatlar: CSV, TSV, TXT');
        setYuklemeDurum('hata');
        return;
      }

      const text = await file.text();
      const { basliklar: b, satirlar: s } = parseCSV(text);

      if (b.length === 0 || s.length === 0) {
        setHataMsg('Dosya boş veya geçersiz formatta.');
        setYuklemeDurum('hata');
        return;
      }

      setBasliklar(b);
      setSatirlar(s);
      setEslestirme(otomatikEslestir(b, hedefAlanlar));
      setYuklemeDurum('basarili');
    } catch {
      setHataMsg('Dosya okunamadı.');
      setYuklemeDurum('hata');
    }
  }, [hedefAlanlar]);

  // ── İşlenmiş satırlar ──
  const islenmis: IslenmisSatir[] = useMemo(() => {
    if (basliklar.length === 0) return [];

    return satirlar.map((satir, idx) => {
      const data: Record<string, string> = {};
      const hatalar: DogrulamaHatasi[] = [];

      // Eşleştirmeye göre veri çek
      for (const [colIdx, alanKey] of Object.entries(eslestirme)) {
        const val = satir[Number(colIdx)] || '';
        if (val) data[alanKey] = val;
      }

      // Zorunlu alan kontrolü
      for (const alan of hedefAlanlar) {
        if (alan.zorunlu && !data[alan.key]?.trim()) {
          hatalar.push({ satir: idx + 1, alan: alan.label, mesaj: 'Zorunlu alan boş' });
        }
      }

      // Telefon doğrulama
      if (data.tel) {
        const telHata = telefonDogrula(data.tel);
        if (telHata) hatalar.push({ satir: idx + 1, alan: 'Telefon', mesaj: telHata });
        else data.tel = telefonFormatla(data.tel);
      }

      // E-posta doğrulama
      if (data.mail) {
        const mailHata = epostaDogrula(data.mail);
        if (mailHata) hatalar.push({ satir: idx + 1, alan: 'E-posta', mesaj: mailHata });
      }

      // Mükerrer kontrolü
      let mukerrer = false;
      if (data.tc) {
        mukerrer = mevcutKayitlar.some((k) => k.tc === data.tc);
      }
      if (!mukerrer && data.vergiNo) {
        mukerrer = mevcutKayitlar.some((k) => k.vergiNo === data.vergiNo);
      }
      if (!mukerrer && hedefTip === 'vekil' && data.baro && data.baroSicil) {
        mukerrer = mevcutKayitlar.some((k) => k.baro === data.baro && k.baroSicil === data.baroSicil);
      }
      // Dava mükerrer: aynı esas yılı + no
      if (!mukerrer && hedefTip === 'dava' && data.esasYil && data.esasNo) {
        mukerrer = mevcutKayitlar.some((k) => k.esasYil === data.esasYil && k.esasNo === data.esasNo);
      }
      // İcra mükerrer: aynı esas yılı + no
      if (!mukerrer && hedefTip === 'icra' && data.esasYil && data.esasNo) {
        mukerrer = mevcutKayitlar.some((k) => k.esasYil === data.esasYil && k.esasNo === data.esasNo);
      }

      return { data, hatalar, mukerrer };
    });
  }, [satirlar, basliklar, eslestirme, hedefAlanlar, mevcutKayitlar, hedefTip]);

  // ── İstatistikler ──
  const gecerliSayisi = islenmis.filter((s) => s.hatalar.length === 0 && (!mukerrerHaric || !s.mukerrer)).length;
  const hataliSayisi = islenmis.filter((s) => s.hatalar.length > 0).length;
  const mukerrerSayisi = islenmis.filter((s) => s.mukerrer).length;

  // ── Aktarım ──
  const handleAktar = useCallback(async () => {
    setAktarimDurum('aktariliyor');
    const aktarilacak = islenmis
      .filter((s) => s.hatalar.length === 0 && (!mukerrerHaric || !s.mukerrer))
      .map((s) => s.data);

    try {
      await onAktar(aktarilacak);
      clearDraft();
      setAktarimSonuc({ basarili: aktarilacak.length, hata: 0 });
      setAktarimDurum('bitti');
    } catch {
      setAktarimSonuc({ basarili: 0, hata: aktarilacak.length });
      setAktarimDurum('bitti');
    }
  }, [islenmis, mukerrerHaric, onAktar]);

  // ── Sıfırla ──
  const sifirla = useCallback(() => {
    setAdim('yukle');
    setBasliklar([]);
    setSatirlar([]);
    setEslestirme({});
    setYuklemeDurum('bos');
    setHataMsg('');
    setAktarimDurum('hazir');
    setAktarimSonuc(null);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleKapat = useCallback(() => {
    clearDraft();
    sifirla();
    onClose();
  }, [clearDraft, sifirla, onClose]);

  const tipLabel = hedefTip === 'muvekkil' ? 'Müvekkil' : hedefTip === 'karsiTaraf' ? 'Karşı Taraf' : hedefTip === 'vekil' ? 'Avukat' : hedefTip === 'dava' ? 'Dava' : 'İcra';

  // Zorunlu alanlar eşleşmiş mi?
  const zorunluEksik = hedefAlanlar
    .filter((a) => a.zorunlu)
    .filter((a) => !Object.values(eslestirme).includes(a.key));

  return (
    <Modal open={open} onClose={handleKapat} title={`📥 ${tipLabel} İçe Aktar (CSV)`} maxWidth="max-w-2xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => {
        const d = loadDraft();
        if (d) {
          const draft = d as Record<string, unknown>;
          if (draft.adim) setAdim(draft.adim as Adim);
          if (draft.eslestirme) {
            try { setEslestirme(JSON.parse(draft.eslestirme as string)); } catch { /* ignore */ }
          }
          if (typeof draft.mukerrerHaric === 'boolean') setMukerrerHaric(draft.mukerrerHaric);
        }
        clearDraft();
      }}
      onDiscardDraft={clearDraft}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">

        {/* ═══ ADIM 1: DOSYA YÜKLE ═══ */}
        {adim === 'yukle' && (
          <div className="space-y-4">
            {/* Talimatlar */}
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 text-xs text-text-muted space-y-2">
              <p className="font-semibold text-text">📋 Nasıl Hazırlanır?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>CSV dosyanızda ilk satır <strong>başlık satırı</strong> olmalı</li>
                <li>Desteklenen formatlar: <strong>.csv, .tsv, .txt</strong></li>
                <li>Ayırıcı otomatik algılanır (virgül, noktalı virgül, tab)</li>
                <li>UTF-8 kodlama önerilir (Türkçe karakter desteği için)</li>
              </ul>
            </div>

            {/* Dosya seç */}
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-gold/40 transition-colors">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleDosya}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer">
                <div className="text-3xl mb-2">📁</div>
                <p className="text-sm font-medium text-text">Dosya seçmek için tıklayın</p>
                <p className="text-xs text-text-muted mt-1">veya sürükleyip bırakın</p>
              </label>
            </div>

            {/* Hata */}
            {yuklemeDurum === 'hata' && (
              <div className="bg-red/10 border border-red/30 rounded-lg p-3 text-xs text-red">
                ⚠️ {hataMsg}
              </div>
            )}

            {/* Yükleme başarılı — devam */}
            {yuklemeDurum === 'basarili' && (
              <div className="space-y-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-400">
                  ✅ {satirlar.length} satır ve {basliklar.length} sütun bulundu.
                </div>
                <button
                  onClick={() => setAdim('eslestir')}
                  className="w-full py-2.5 rounded-xl bg-gold text-bg font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Sütun Eşleştirmeye Geç →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ ADIM 2: SÜTUN EŞLEŞTİRME ═══ */}
        {adim === 'eslestir' && (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">
              CSV sütunlarını sistem alanlarıyla eşleştirin. Otomatik eşleşenler işaretlenmiştir.
            </p>

            <div className="space-y-2">
              {basliklar.map((baslik, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-card rounded-lg p-2.5 border border-border">
                  {/* CSV sütun adı */}
                  <div className="w-1/3 min-w-0">
                    <span className="text-xs font-medium text-gold truncate block">{baslik}</span>
                    <span className="text-[10px] text-text-dim truncate block">
                      Örnek: {satirlar[0]?.[idx] || '—'}
                    </span>
                  </div>

                  {/* Ok */}
                  <span className="text-text-dim text-xs">→</span>

                  {/* Hedef alan seçimi */}
                  <select
                    value={eslestirme[idx] || ''}
                    onChange={(e) => {
                      const yeni = { ...eslestirme };
                      if (e.target.value) yeni[idx] = e.target.value;
                      else delete yeni[idx];
                      setEslestirme(yeni);
                    }}
                    className="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:border-gold outline-none"
                  >
                    <option value="">— Atla —</option>
                    {hedefAlanlar.map((alan) => (
                      <option
                        key={alan.key}
                        value={alan.key}
                        disabled={Object.values(eslestirme).includes(alan.key) && eslestirme[idx] !== alan.key}
                      >
                        {alan.label} {alan.zorunlu ? '*' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Eşleşme durumu */}
                  {eslestirme[idx] && <span className="text-green-400 text-sm">✓</span>}
                </div>
              ))}
            </div>

            {/* Zorunlu uyarı */}
            {zorunluEksik.length > 0 && (
              <div className="bg-red/10 border border-red/30 rounded-lg p-3 text-xs text-red">
                ⚠️ Zorunlu alanlar eşleştirilmeli: {zorunluEksik.map((a) => a.label).join(', ')}
              </div>
            )}

            {/* Butonlar */}
            <div className="flex gap-2">
              <button
                onClick={() => setAdim('yukle')}
                className="flex-1 py-2 rounded-xl bg-card border border-border text-text text-sm hover:bg-hover transition-colors"
              >
                ← Geri
              </button>
              <button
                onClick={() => setAdim('onizle')}
                disabled={zorunluEksik.length > 0}
                className="flex-1 py-2 rounded-xl bg-gold text-bg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Önizle →
              </button>
            </div>
          </div>
        )}

        {/* ═══ ADIM 3: ÖNİZLE & AKTAR ═══ */}
        {adim === 'onizle' && aktarimDurum !== 'bitti' && (
          <div className="space-y-4">
            {/* Özet kartlar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-green-400">{gecerliSayisi}</div>
                <div className="text-[10px] text-text-muted">Geçerli</div>
              </div>
              <div className="bg-red/10 border border-red/20 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-red">{hataliSayisi}</div>
                <div className="text-[10px] text-text-muted">Hatalı</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-yellow-400">{mukerrerSayisi}</div>
                <div className="text-[10px] text-text-muted">Mükerrer</div>
              </div>
            </div>

            {/* Mükerrer seçenek */}
            {mukerrerSayisi > 0 && (
              <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={mukerrerHaric}
                  onChange={(e) => setMukerrerHaric(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-gold"
                />
                Mükerrer kayıtları hariç tut ({mukerrerSayisi} kayıt)
              </label>
            )}

            {/* Tablo önizleme */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-xs">
                  <thead className="bg-card sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-text-muted font-medium">#</th>
                      <th className="px-2 py-1.5 text-left text-text-muted font-medium">Durum</th>
                      {Object.values(eslestirme).map((alanKey) => {
                        const alan = hedefAlanlar.find((a) => a.key === alanKey);
                        return (
                          <th key={alanKey} className="px-2 py-1.5 text-left text-text-muted font-medium whitespace-nowrap">
                            {alan?.label || alanKey}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {islenmis.slice(0, 50).map((satir, idx) => (
                      <tr
                        key={idx}
                        className={`border-t border-border/50 ${
                          satir.hatalar.length > 0
                            ? 'bg-red/5'
                            : satir.mukerrer
                            ? 'bg-yellow-500/5'
                            : ''
                        }`}
                      >
                        <td className="px-2 py-1.5 text-text-dim">{idx + 1}</td>
                        <td className="px-2 py-1.5">
                          {satir.hatalar.length > 0 ? (
                            <span className="text-red" title={satir.hatalar.map((h) => `${h.alan}: ${h.mesaj}`).join(', ')}>
                              ❌
                            </span>
                          ) : satir.mukerrer ? (
                            <span className="text-yellow-400" title="Mükerrer kayıt">⚠️</span>
                          ) : (
                            <span className="text-green-400">✅</span>
                          )}
                        </td>
                        {Object.values(eslestirme).map((alanKey) => (
                          <td key={alanKey} className="px-2 py-1.5 text-text truncate max-w-[120px]">
                            {satir.data[alanKey] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {islenmis.length > 50 && (
                <div className="px-3 py-1.5 text-[10px] text-text-dim bg-card border-t border-border">
                  İlk 50 kayıt gösteriliyor. Toplam: {islenmis.length}
                </div>
              )}
            </div>

            {/* Hata detayları */}
            {hataliSayisi > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-red font-medium">
                  {hataliSayisi} hatalı kayıt detayları
                </summary>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {islenmis
                    .filter((s) => s.hatalar.length > 0)
                    .slice(0, 20)
                    .flatMap((s) =>
                      s.hatalar.map((h, hi) => (
                        <div key={`${s.data.ad}-${hi}`} className="text-text-muted">
                          Satır {h.satir}: <span className="text-red">{h.alan}</span> — {h.mesaj}
                        </div>
                      ))
                    )}
                </div>
              </details>
            )}

            {/* Butonlar */}
            <div className="flex gap-2">
              <button
                onClick={() => setAdim('eslestir')}
                className="flex-1 py-2 rounded-xl bg-card border border-border text-text text-sm hover:bg-hover transition-colors"
              >
                ← Geri
              </button>
              <button
                onClick={handleAktar}
                disabled={gecerliSayisi === 0 || aktarimDurum === 'aktariliyor'}
                className="flex-1 py-2.5 rounded-xl bg-gold text-bg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {aktarimDurum === 'aktariliyor' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                    Aktarılıyor...
                  </>
                ) : (
                  `${gecerliSayisi} Kayıt Aktar ✓`
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ SONUÇ ═══ */}
        {aktarimDurum === 'bitti' && aktarimSonuc && (
          <div className="text-center space-y-4 py-4">
            <div className="text-4xl">{aktarimSonuc.basarili > 0 ? '🎉' : '❌'}</div>
            <div>
              <p className="text-lg font-bold text-text">
                {aktarimSonuc.basarili > 0
                  ? `${aktarimSonuc.basarili} kayıt başarıyla aktarıldı!`
                  : 'Aktarım başarısız oldu.'}
              </p>
              {aktarimSonuc.hata > 0 && (
                <p className="text-xs text-red mt-1">{aktarimSonuc.hata} kayıt aktarılamadı.</p>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={sifirla}
                className="px-6 py-2 rounded-xl bg-card border border-border text-text text-sm hover:bg-hover transition-colors"
              >
                Yeni Aktarım
              </button>
              <button
                onClick={handleKapat}
                className="px-6 py-2 rounded-xl bg-gold text-bg font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
