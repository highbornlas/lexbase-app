'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal, FormGroup, FormInput, FormSelect, FormTextarea, BtnGold, BtnOutline } from '@/components/ui/Modal';
import { useModalDraft } from '@/lib/hooks/useModalDraft';
import { useTodoKaydet, useTodoSil, useTodolar, type Todo } from '@/lib/hooks/useTodolar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { useDavalar } from '@/lib/hooks/useDavalar';
import { useIcralar } from '@/lib/hooks/useIcra';
import { useDanismanliklar } from '@/lib/hooks/useDanismanlik';
import { useArabuluculuklar } from '@/lib/hooks/useArabuluculuk';
import { useIhtarnameler } from '@/lib/hooks/useIhtarname';
import { usePersoneller } from '@/lib/hooks/usePersonel';
import { useYetki } from '@/lib/hooks/useRol';
import { createClient } from '@/lib/supabase/client';
import { fmtTarih } from '@/lib/utils';

const VARSAYILAN_KATEGORILER = [
  'Duruşma',
  'Dilekçe',
  'Araştırma',
  'Toplantı',
  'İdari',
  'Takip',
  'Belge Hazırlama',
  'Müvekkil İletişimi',
];

const LS_KEY = 'lb_gorev_kategorileri';

function getKategoriler(): string[] {
  const varsayilan = [...VARSAYILAN_KATEGORILER];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const custom = JSON.parse(raw) as string[];
      return [...varsayilan, ...custom.filter((k) => !varsayilan.includes(k))];
    }
  } catch { /* ignore */ }
  return varsayilan;
}

function addKategori(yeni: string): string[] {
  const mevcut = getKategoriler();
  if (mevcut.includes(yeni)) return mevcut;
  try {
    const raw = localStorage.getItem(LS_KEY);
    const custom = raw ? (JSON.parse(raw) as string[]) : [];
    custom.push(yeni);
    localStorage.setItem(LS_KEY, JSON.stringify(custom));
  } catch { /* ignore */ }
  return [...mevcut, yeni];
}

interface GorevModalProps {
  open: boolean;
  onClose: () => void;
  gorev?: Todo | null;
  muvId?: string;  // pre-fill from MuvPlanlama
}

const bos: Partial<Todo> = {
  baslik: '',
  aciklama: '',
  oncelik: 'Orta',
  durum: 'Bekliyor',
  sonTarih: '',
  muvId: '',
  dosyaTur: '',
  dosyaId: '',
};

export function GorevModal({ open, onClose, gorev, muvId }: GorevModalProps) {
  const [form, setForm] = useState<Partial<Todo>>({ ...bos });
  const [initialForm, setInitialForm] = useState<Partial<Todo>>({ ...bos });
  const [hata, setHata] = useState('');
  const [silOnay, setSilOnay] = useState(false);
  const authIdRef = useRef<string | null>(null);
  const [kategoriler, setKategoriler] = useState<string[]>(VARSAYILAN_KATEGORILER);
  const [yeniKatGoster, setYeniKatGoster] = useState(false);
  const [yeniKatAd, setYeniKatAd] = useState('');
  const [yeniAltGorev, setYeniAltGorev] = useState('');
  const [yeniYorum, setYeniYorum] = useState('');
  const [currentUserAd, setCurrentUserAd] = useState('');

  const kaydet = useTodoKaydet();
  const silMut = useTodoSil();
  const { data: tumTodolar } = useTodolar();
  const sablonlar = (tumTodolar || []).filter((t) => t.sablon === true);
  const { data: muvekkillar } = useMuvekkillar();
  const { data: davalar } = useDavalar();
  const { data: icralar } = useIcralar();
  const { data: danismanliklar } = useDanismanliklar();
  const { data: arabuluculuklar } = useArabuluculuklar();
  const { data: ihtarnameler } = useIhtarnameler();
  const { data: personeller } = usePersoneller();

  const { yetkili: ekleYetkisi } = useYetki('gorev:ekle');
  const { yetkili: duzenleYetkisi } = useYetki('gorev:duzenle');
  const { yetkili: silYetkisi } = useYetki('gorev:sil');

  // Fetch auth user ID and display name on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      authIdRef.current = data.user?.id ?? null;
      if (data.user?.id) {
        const { data: kul } = await supabase
          .from('kullanicilar')
          .select('ad')
          .eq('auth_id', data.user.id)
          .single();
        setCurrentUserAd(kul?.ad || data.user?.email || 'Ben');
      }
    });
  }, []);

  useEffect(() => {
    let init: Partial<Todo>;
    if (gorev) {
      init = { ...gorev };
    } else {
      init = {
        ...bos,
        id: crypto.randomUUID(),
        olusturmaTarih: new Date().toISOString(),
        olusturanId: authIdRef.current || '',
        ...(muvId ? { muvId } : {}),
      };
    }
    setInitialForm(init);
    setForm(init);
    setHata('');
    setSilOnay(false);
    setYeniAltGorev('');
    setYeniYorum('');
    setYeniKatGoster(false);
    setYeniKatAd('');
    setKategoriler(getKategoriler());
  }, [gorev, open, muvId]);

  const draftKey = `gorev_${form.id || 'yeni'}`;
  const { isDirty, hasDraft, loadDraft, clearDraft } = useModalDraft(
    draftKey, form as Record<string, unknown>, initialForm as Record<string, unknown>, open
  );

  function handleChange(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Clear dosyaId when dosyaTur changes
      if (field === 'dosyaTur') {
        next.dosyaId = '';
      }
      // Store atananAd when atananId changes
      if (field === 'atananId') {
        const kisi = personeller?.find((p) => p.id === value);
        next.atananAd = kisi?.ad || '';
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!form.baslik?.trim()) {
      setHata('Görev başlığı zorunludur.');
      return;
    }
    setHata('');
    try {
      await kaydet.mutateAsync(form as Todo);
      clearDraft();
      onClose();
    } catch {
      setHata('Kayıt sırasında bir hata oluştu.');
    }
  }

  async function handleSil() {
    if (!gorev) return;
    if (!silOnay) {
      setSilOnay(true);
      return;
    }
    try {
      await silMut.mutateAsync(gorev.id);
      onClose();
    } catch {
      setHata('Silme sırasında bir hata oluştu.');
    }
  }

  // Alt görev (checklist) helpers
  function toggleAltGorev(index: number) {
    setForm((prev) => {
      const liste = [...(prev.altGorevler || [])];
      liste[index] = { ...liste[index], tamam: !liste[index].tamam };
      return { ...prev, altGorevler: liste };
    });
  }

  function silAltGorev(index: number) {
    setForm((prev) => {
      const liste = [...(prev.altGorevler || [])];
      liste.splice(index, 1);
      return { ...prev, altGorevler: liste };
    });
  }

  function ekleAltGorev() {
    const baslik = yeniAltGorev.trim();
    if (!baslik) return;
    setForm((prev) => ({
      ...prev,
      altGorevler: [...(prev.altGorevler || []), { id: crypto.randomUUID(), baslik, tamam: false }],
    }));
    setYeniAltGorev('');
  }

  async function yorumEkle() {
    const metin = yeniYorum.trim();
    if (!metin || !authIdRef.current) return;
    const yeniYorumObj = {
      id: crypto.randomUUID(),
      yazar: authIdRef.current,
      yazarAd: currentUserAd || 'Ben',
      tarih: new Date().toISOString(),
      metin,
    };
    const guncellenmisYorumlar = [...(form.yorumlar || []), yeniYorumObj];
    const guncelForm = { ...form, yorumlar: guncellenmisYorumlar };
    setForm(guncelForm);
    setYeniYorum('');
    try {
      await kaydet.mutateAsync(guncelForm as Todo);
    } catch {
      setHata('Yorum kaydedilirken bir hata oluştu.');
    }
  }

  const tamamlanan = (form.altGorevler || []).filter((a) => a.tamam).length;
  const tamamlananYuzde = form.altGorevler && form.altGorevler.length > 0
    ? Math.round((tamamlanan / form.altGorevler.length) * 100)
    : 0;

  // Determine dosya list based on dosyaTur
  function getDosyaOptions() {
    switch (form.dosyaTur) {
      case 'Dava':
        return davalar?.map((d) => ({
          id: d.id,
          label: (d.mtur ? d.mtur + ' ' : '') + (d.esasYil && d.esasNo ? d.esasYil + '/' + d.esasNo : d.konu || 'İsimsiz'),
        })) || [];
      case 'İcra':
        return icralar?.map((d) => ({
          id: d.id,
          label: (d.daire || d.yargiBirimi || '') + ' ' + (d.esasYil && d.esasNo ? d.esasYil + '/' + d.esasNo : d.konu || 'İsimsiz'),
        })) || [];
      case 'Danışmanlık':
        return danismanliklar?.map((d) => ({
          id: d.id,
          label: d.konu || 'İsimsiz',
        })) || [];
      case 'Arabuluculuk':
        return arabuluculuklar?.map((d) => ({
          id: d.id,
          label: d.konu || 'İsimsiz',
        })) || [];
      case 'İhtarname':
        return ihtarnameler?.map((d) => ({
          id: d.id,
          label: d.konu || 'İsimsiz',
        })) || [];
      default:
        return [];
    }
  }

  const dosyaOptions = getDosyaOptions();
  const kaydetDisabled = kaydet.isPending || (gorev ? !duzenleYetkisi : !ekleYetkisi);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={gorev ? 'Görev Düzenle' : 'Yeni Görev'}
      maxWidth="max-w-xl"
      dirty={isDirty}
      hasDraft={hasDraft()}
      onLoadDraft={() => { const d = loadDraft(); if (d) setForm(d as Partial<Todo>); clearDraft(); }}
      onDiscardDraft={clearDraft}
      footer={
        <div className="flex w-full items-center justify-between">
          <div>
            {gorev && silYetkisi && (
              <button
                type="button"
                onClick={handleSil}
                disabled={silMut.isPending}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  silOnay
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-600/10 text-red-500 hover:bg-red-600/20'
                }`}
              >
                {silMut.isPending
                  ? 'Siliniyor...'
                  : silOnay
                    ? 'Silmek istediğinize emin misiniz?'
                    : 'Sil'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <BtnOutline onClick={onClose}>İptal</BtnOutline>
            <BtnGold onClick={handleSubmit} disabled={kaydetDisabled}>
              {kaydet.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </BtnGold>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-[10px] px-3 py-2 text-xs text-red">
            {hata}
          </div>
        )}

        {!gorev && sablonlar.length > 0 && (
          <FormGroup label="Şablondan Oluştur">
            <FormSelect
              value=""
              onChange={(e) => {
                const sablon = sablonlar.find((s) => s.id === e.target.value);
                if (sablon) {
                  setForm((prev) => ({
                    ...prev,
                    baslik: sablon.baslik || '',
                    aciklama: sablon.aciklama || '',
                    oncelik: sablon.oncelik || 'Orta',
                    kategori: sablon.kategori || '',
                    altGorevler: sablon.altGorevler
                      ? sablon.altGorevler.map((a) => ({ ...a, id: crypto.randomUUID(), tamam: false }))
                      : [],
                    dosyaTur: sablon.dosyaTur || '',
                    tekrar: sablon.tekrar || 'yok',
                    id: crypto.randomUUID(),
                    olusturmaTarih: new Date().toISOString(),
                  }));
                }
              }}
            >
              <option value="">Şablon seçiniz...</option>
              {sablonlar.map((s) => (
                <option key={s.id} value={s.id}>{s.baslik || 'İsimsiz Şablon'}</option>
              ))}
            </FormSelect>
          </FormGroup>
        )}

        <FormGroup label="Görev Başlığı" required>
          <FormInput value={form.baslik || ''} onChange={(e) => handleChange('baslik', e.target.value)} placeholder="Ne yapılması gerekiyor?" />
        </FormGroup>

        <FormGroup label="Açıklama">
          <FormTextarea value={form.aciklama || ''} onChange={(e) => handleChange('aciklama', e.target.value)} rows={3} placeholder="Detaylı açıklama..." />
        </FormGroup>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Öncelik">
            <FormSelect value={form.oncelik || ''} onChange={(e) => handleChange('oncelik', e.target.value)}>
              <option value="Yüksek">🔴 Yüksek</option>
              <option value="Orta">🟡 Orta</option>
              <option value="Düşük">🟢 Düşük</option>
            </FormSelect>
          </FormGroup>
          <FormGroup label="Durum">
            <FormSelect value={form.durum || ''} onChange={(e) => handleChange('durum', e.target.value)}>
              <option value="Bekliyor">Bekliyor</option>
              <option value="Devam Ediyor">Devam Ediyor</option>
              <option value="Tamamlandı">Tamamlandı</option>
              <option value="İptal">İptal</option>
            </FormSelect>
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Son Tarih">
            <FormInput type="date" value={form.sonTarih || ''} onChange={(e) => handleChange('sonTarih', e.target.value)} />
          </FormGroup>
          <FormGroup label="Tekrar">
            <FormSelect value={form.tekrar || 'yok'} onChange={(e) => handleChange('tekrar', e.target.value)}>
              <option value="yok">Yok</option>
              <option value="gunluk">Günlük</option>
              <option value="haftalik">Haftalık</option>
              <option value="aylik">Aylık</option>
              <option value="yillik">Yıllık</option>
            </FormSelect>
          </FormGroup>
        </div>

        {form.tekrar && form.tekrar !== 'yok' && (
          <FormGroup label="Tekrar Bitiş Tarihi">
            <FormInput type="date" value={form.tekrarSonTarih || ''} onChange={(e) => handleChange('tekrarSonTarih', e.target.value)} />
          </FormGroup>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Müvekkil (Opsiyonel)">
            <FormSelect value={form.muvId || ''} onChange={(e) => handleChange('muvId', e.target.value)}>
              <option value="">Seçiniz</option>
              {muvekkillar?.map((m) => (
                <option key={m.id} value={m.id}>{m.ad}</option>
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label="Atanan Kişi">
          <FormSelect value={(form.atananId as string) || ''} onChange={(e) => handleChange('atananId', e.target.value)}>
            <option value="">Seçiniz</option>
            {personeller?.map((p) => (
              <option key={p.id} value={p.id}>{p.ad}{p.rol ? ` (${p.rol})` : ''}</option>
            ))}
          </FormSelect>
          </FormGroup>
        </div>

        <FormGroup label="Kategori">
          <FormSelect value={(form.kategori as string) || ''} onChange={(e) => handleChange('kategori', e.target.value)}>
            <option value="">Seçiniz</option>
            {kategoriler.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </FormSelect>
          {!yeniKatGoster ? (
            <button
              type="button"
              onClick={() => setYeniKatGoster(true)}
              className="mt-1.5 text-[11px] text-gold hover:text-gold-light transition-colors"
            >
              + Yeni Kategori Ekle
            </button>
          ) : (
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="text"
                value={yeniKatAd}
                onChange={(e) => setYeniKatAd(e.target.value)}
                placeholder="Kategori adı..."
                className="flex-1 px-2 py-1 bg-surface border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const ad = yeniKatAd.trim();
                    if (ad) {
                      const guncel = addKategori(ad);
                      setKategoriler(guncel);
                      handleChange('kategori', ad);
                      setYeniKatAd('');
                      setYeniKatGoster(false);
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const ad = yeniKatAd.trim();
                  if (ad) {
                    const guncel = addKategori(ad);
                    setKategoriler(guncel);
                    handleChange('kategori', ad);
                    setYeniKatAd('');
                    setYeniKatGoster(false);
                  }
                }}
                className="px-2 py-1 bg-gold text-bg text-[11px] font-semibold rounded hover:bg-gold-light transition-colors"
              >
                Ekle
              </button>
              <button
                type="button"
                onClick={() => { setYeniKatGoster(false); setYeniKatAd(''); }}
                className="px-2 py-1 bg-surface2 text-text-muted text-[11px] rounded hover:text-text transition-colors"
              >
                Vazgeç
              </button>
            </div>
          )}
        </FormGroup>

        <FormGroup label="İlgili Dosya Türü">
          <FormSelect value={form.dosyaTur || ''} onChange={(e) => handleChange('dosyaTur', e.target.value)}>
            <option value="">Yok</option>
            <option value="Dava">Dava</option>
            <option value="İcra">İcra</option>
            <option value="Danışmanlık">Danışmanlık</option>
            <option value="Arabuluculuk">Arabuluculuk</option>
            <option value="İhtarname">İhtarname</option>
          </FormSelect>
        </FormGroup>

        {form.dosyaTur && dosyaOptions.length > 0 && (
          <FormGroup label="Dosya Seç">
            <FormSelect value={form.dosyaId || ''} onChange={(e) => handleChange('dosyaId', e.target.value)}>
              <option value="">Seçiniz</option>
              {dosyaOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </FormSelect>
          </FormGroup>
        )}

        {/* Kontrol Listesi */}
        <div>
          <div className="text-xs font-semibold text-text-muted mb-2">Kontrol Listesi</div>
          {(form.altGorevler || []).map((alt, i) => (
            <div key={alt.id} className="flex items-center gap-2 mb-1.5">
              <input
                type="checkbox"
                checked={alt.tamam}
                onChange={() => toggleAltGorev(i)}
                className="w-3.5 h-3.5 rounded border-border accent-green cursor-pointer"
              />
              <span className={`text-xs flex-1 ${alt.tamam ? 'line-through text-text-dim' : 'text-text'}`}>
                {alt.baslik}
              </span>
              <button
                type="button"
                onClick={() => silAltGorev(i)}
                className="text-text-dim hover:text-red text-sm leading-none transition-colors"
              >
                &times;
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Yeni madde ekle..."
              value={yeniAltGorev}
              onChange={(e) => setYeniAltGorev(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ekleAltGorev(); } }}
              className="flex-1 px-2 py-1.5 bg-surface border border-border rounded text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
            />
            <button
              type="button"
              onClick={ekleAltGorev}
              className="px-3 py-1.5 bg-gold text-bg text-[11px] font-semibold rounded hover:bg-gold-light transition-colors"
            >
              Ekle
            </button>
          </div>
          {form.altGorevler && form.altGorevler.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                <div className="h-full bg-green rounded-full transition-all" style={{ width: `${tamamlananYuzde}%` }} />
              </div>
              <div className="text-[10px] text-text-dim mt-0.5">{tamamlanan}/{form.altGorevler.length} tamamlandı</div>
            </div>
          )}
        </div>

        {/* Şablon olarak kaydet */}
        <div className="flex items-start gap-2 pt-2 border-t border-border">
          <input
            type="checkbox"
            id="sablon-checkbox"
            checked={!!form.sablon}
            onChange={(e) => setForm((prev) => ({ ...prev, sablon: e.target.checked }))}
            className="w-3.5 h-3.5 mt-0.5 rounded border-border accent-gold cursor-pointer"
          />
          <div>
            <label htmlFor="sablon-checkbox" className="text-xs font-medium text-text cursor-pointer">
              Şablon olarak kaydet
            </label>
            <div className="text-[10px] text-text-dim mt-0.5">Şablonlar yeni görev oluştururken kullanılabilir</div>
          </div>
        </div>

        {/* Yorumlar - only show when editing */}
        {gorev && (
          <div className="border-t border-border pt-4 mt-4">
            <div className="text-xs font-semibold text-text-muted mb-3">Yorumlar</div>

            {(form.yorumlar || []).map((y) => (
              <div key={y.id} className="mb-3 bg-surface2/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-text">{y.yazarAd}</span>
                  <span className="text-[10px] text-text-dim">{fmtTarih(y.tarih)}</span>
                </div>
                <div className="text-xs text-text-muted">{y.metin}</div>
              </div>
            ))}

            {(!form.yorumlar || form.yorumlar.length === 0) && (
              <div className="text-xs text-text-dim mb-3">Henüz yorum yapılmamış</div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={yeniYorum}
                onChange={(e) => setYeniYorum(e.target.value)}
                placeholder="Yorum ekle..."
                className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-xs text-text placeholder:text-text-dim focus:outline-none focus:border-gold"
                onKeyDown={(e) => { if (e.key === 'Enter' && yeniYorum.trim()) yorumEkle(); }}
              />
              <button
                type="button"
                onClick={yorumEkle}
                disabled={!yeniYorum.trim()}
                className="px-3 py-2 bg-gold/10 text-gold text-xs font-medium rounded-lg hover:bg-gold/20 transition-colors disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
