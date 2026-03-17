'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTodolar, useTodoKaydet, useTodoSil, type Todo } from '@/lib/hooks/useTodolar';
import { useMuvekkillar } from '@/lib/hooks/useMuvekkillar';
import { usePersoneller } from '@/lib/hooks/usePersonel';
import { useYetki } from '@/lib/hooks/useRol';
import { createClient } from '@/lib/supabase/client';
import { fmtTarih } from '@/lib/utils';
import { GorevModal } from '@/components/modules/GorevModal';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { QuickDateChips } from '@/components/ui/QuickDateChips';

const ONCELIK_RENK: Record<string, { bg: string; text: string; icon: string }> = {
  'Yüksek': { bg: 'bg-red-dim', text: 'text-red', icon: '🔴' },
  'Orta': { bg: 'bg-gold-dim', text: 'text-gold', icon: '🟡' },
  'Düşük': { bg: 'bg-green-dim', text: 'text-green', icon: '🟢' },
};

const DURUM_RENK: Record<string, string> = {
  'Bekliyor': 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  'Devam Ediyor': 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  'Tamamlandı': 'bg-green-dim text-green border-green/20',
  'İptal': 'bg-surface2 text-text-dim border-border',
};

type Grup = 'Gecikmiş' | 'Bugün' | 'Bu Hafta' | 'Diğer' | 'Tamamlandı / İptal';

export default function GorevlerPage() {
  useEffect(() => { document.title = 'Görevler | LexBase'; }, []);

  const { data: todolar, isLoading } = useTodolar();
  const { data: muvekkillar } = useMuvekkillar();
  const { data: personeller } = usePersoneller();
  const todoKaydet = useTodoKaydet();
  const todoSil = useTodoSil();
  const { yetkili: silYetkisi } = useYetki('gorev:sil');
  const { yetkili: ekleYetkisi } = useYetki('gorev:ekle');
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState<'hepsi' | 'aktif' | 'tamamlandi' | 'bana_atanan'>('aktif');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliGorev, setSeciliGorev] = useState<Todo | null>(null);
  const [silOnayId, setSilOnayId] = useState<string | null>(null);
  const [siralama, setSiralama] = useState<string>('');
  const [topluSecim, setTopluSecim] = useState(false);
  const [seciliIds, setSeciliIds] = useState<Set<string>>(new Set());
  const [tarihChip, setTarihChip] = useState('tumzaman');
  const [tarihBaslangic, setTarihBaslangic] = useState('');
  const [tarihBitis, setTarihBitis] = useState('');

  // Auth user email for "bana atanan" filter
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data.user?.email ?? null);
    });
  }, []);

  // Personel ad map + my personel ID
  const personelAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    personeller?.forEach((p) => { map[p.id] = p.ad || '?'; });
    return map;
  }, [personeller]);

  const myPersonelId = useMemo(() => {
    if (!currentUserEmail || !personeller) return null;
    const me = personeller.find((p) => p.email?.toLocaleLowerCase('tr') === currentUserEmail.toLocaleLowerCase('tr'));
    return me?.id ?? null;
  }, [currentUserEmail, personeller]);

  async function gorevSil(id: string) {
    try {
      await todoSil.mutateAsync(id);
    } finally {
      setSilOnayId(null);
    }
  }

  function toggleTamamla(todo: Todo) {
    const yeniDurum = todo.durum === 'Tamamlandı' ? 'Bekliyor' : 'Tamamlandı';
    todoKaydet.mutate({
      ...todo,
      durum: yeniDurum,
      ...(yeniDurum === 'Tamamlandı' ? { tamamlanmaTarih: new Date().toISOString() } : { tamamlanmaTarih: undefined }),
    });
  }

  function topluSecimToggle(id: string) {
    setSeciliIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function topluSecimKapat() {
    setTopluSecim(false);
    setSeciliIds(new Set());
  }

  async function topluDurumDegistir(yeniDurum: 'Tamamlandı' | 'İptal') {
    if (!todolar) return;
    const seciliGorevler = todolar.filter((t) => seciliIds.has(t.id));
    for (const t of seciliGorevler) {
      todoKaydet.mutate({
        ...t,
        durum: yeniDurum,
        ...(yeniDurum === 'Tamamlandı' ? { tamamlanmaTarih: new Date().toISOString() } : {}),
      });
    }
    topluSecimKapat();
  }

  async function topluSilme() {
    for (const id of seciliIds) {
      todoSil.mutate(id);
    }
    topluSecimKapat();
  }

  const muvAdMap = useMemo(() => {
    const map: Record<string, string> = {};
    muvekkillar?.forEach((m) => { map[m.id] = m.ad || '?'; });
    return map;
  }, [muvekkillar]);

  function csvDisaAktar() {
    if (!todolar) return;
    const gorunurGorevler: Todo[] = [];
    gruplar.forEach((gorevler) => { gorevler.forEach((t) => gorunurGorevler.push(t)); });

    const satirlar = [
      ['Başlık', 'Açıklama', 'Öncelik', 'Durum', 'Son Tarih', 'Müvekkil', 'Atanan', 'Kategori'].join(';'),
      ...gorunurGorevler.map((t) =>
        [
          `"${(t.baslik || '').replace(/"/g, '""')}"`,
          `"${(t.aciklama || '').replace(/"/g, '""')}"`,
          t.oncelik || '',
          t.durum || '',
          t.sonTarih || '',
          muvAdMap[t.muvId || ''] || '',
          personelAdMap[t.atananId || ''] || '',
          t.kategori || '',
        ].join(';')
      ),
    ];

    const bom = '\uFEFF';
    const blob = new Blob([bom + satirlar.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gorevler_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Tüm görünen görev ID'lerini al
  function tumGorunurIds(): string[] {
    const ids: string[] = [];
    gruplar.forEach((gorevler) => { gorevler.forEach((t) => ids.push(t.id)); });
    return ids;
  }

  // KPI'lar
  const kpis = useMemo(() => {
    if (!todolar) return { toplam: 0, bekliyor: 0, devam: 0, tamamlandi: 0, gecikmisSayi: 0, banaAtanan: 0 };
    const gercekGorevler = todolar.filter((t) => !t.sablon);
    const bugunStr = new Date().toISOString().split('T')[0];
    return {
      toplam: gercekGorevler.length,
      bekliyor: gercekGorevler.filter((t) => t.durum === 'Bekliyor').length,
      devam: gercekGorevler.filter((t) => t.durum === 'Devam Ediyor').length,
      tamamlandi: gercekGorevler.filter((t) => t.durum === 'Tamamlandı').length,
      gecikmisSayi: gercekGorevler.filter((t) =>
        t.sonTarih && t.sonTarih < bugunStr && t.durum !== 'Tamamlandı' && t.durum !== 'İptal'
      ).length,
      banaAtanan: myPersonelId ? gercekGorevler.filter((t) =>
        t.atananId === myPersonelId && t.durum !== 'Tamamlandı' && t.durum !== 'İptal'
      ).length : 0,
    };
  }, [todolar, myPersonelId]);

  // Gruplandırılmış ve filtrelenmiş görevler
  const gruplar = useMemo(() => {
    if (!todolar) return new Map<Grup, Todo[]>();

    const bugun = new Date();
    const bugunStr = bugun.toISOString().split('T')[0];
    const haftaSonu = new Date(bugun);
    haftaSonu.setDate(bugun.getDate() + 7);
    const haftaSonuStr = haftaSonu.toISOString().split('T')[0];

    let filtrelenmis = todolar.filter(t => !t.sablon);  // exclude templates

    // Filtre
    if (filtre === 'aktif') {
      filtrelenmis = filtrelenmis.filter((t) => t.durum !== 'Tamamlandı' && t.durum !== 'İptal');
    } else if (filtre === 'tamamlandi') {
      filtrelenmis = filtrelenmis.filter((t) => t.durum === 'Tamamlandı' || t.durum === 'İptal');
    } else if (filtre === 'bana_atanan') {
      filtrelenmis = filtrelenmis.filter((t) =>
        t.atananId && myPersonelId && t.atananId === myPersonelId &&
        t.durum !== 'Tamamlandı' && t.durum !== 'İptal'
      );
    }

    // Arama
    if (arama) {
      const q = arama.toLocaleLowerCase('tr');
      filtrelenmis = filtrelenmis.filter((t) =>
        (t.baslik || '').toLocaleLowerCase('tr').includes(q) ||
        (t.aciklama || '').toLocaleLowerCase('tr').includes(q) ||
        (muvAdMap[t.muvId || ''] || '').toLocaleLowerCase('tr').includes(q)
      );
    }

    // Tarih chip filtresi
    if (tarihBaslangic && tarihBitis) {
      filtrelenmis = filtrelenmis.filter((t) => {
        if (!t.sonTarih) return false;
        return t.sonTarih >= tarihBaslangic && t.sonTarih <= tarihBitis;
      });
    }

    // Sıralama
    if (siralama === 'tarih_asc') {
      filtrelenmis = [...filtrelenmis].sort((a, b) => (a.sonTarih || '').localeCompare(b.sonTarih || ''));
    } else if (siralama === 'tarih_desc') {
      filtrelenmis = [...filtrelenmis].sort((a, b) => (b.sonTarih || '').localeCompare(a.sonTarih || ''));
    } else if (siralama === 'oncelik') {
      const oncelikSira: Record<string, number> = { 'Yüksek': 0, 'Orta': 1, 'Düşük': 2 };
      filtrelenmis = [...filtrelenmis].sort((a, b) => (oncelikSira[a.oncelik as keyof typeof oncelikSira] ?? 1) - (oncelikSira[b.oncelik as keyof typeof oncelikSira] ?? 1));
    } else if (siralama === 'baslik') {
      filtrelenmis = [...filtrelenmis].sort((a, b) => (a.baslik || '').localeCompare(b.baslik || '', 'tr'));
    } else if (siralama === 'olusturma') {
      filtrelenmis = [...filtrelenmis].sort((a, b) => (b.olusturmaTarih || '').localeCompare(a.olusturmaTarih || ''));
    }

    const map = new Map<Grup, Todo[]>();
    map.set('Gecikmiş', []);
    map.set('Bugün', []);
    map.set('Bu Hafta', []);
    map.set('Diğer', []);
    map.set('Tamamlandı / İptal', []);

    filtrelenmis.forEach((t) => {
      if (t.durum === 'Tamamlandı' || t.durum === 'İptal') {
        map.get('Tamamlandı / İptal')!.push(t);
      } else if (t.sonTarih && t.sonTarih < bugunStr) {
        map.get('Gecikmiş')!.push(t);
      } else if (t.sonTarih === bugunStr) {
        map.get('Bugün')!.push(t);
      } else if (t.sonTarih && t.sonTarih <= haftaSonuStr) {
        map.get('Bu Hafta')!.push(t);
      } else {
        map.get('Diğer')!.push(t);
      }
    });

    return map;
  }, [todolar, arama, filtre, siralama, muvAdMap, myPersonelId, tarihBaslangic, tarihBitis]);

  const GRUP_RENK: Record<string, string> = {
    'Gecikmiş': 'border-red/30 text-red',
    'Bugün': 'border-orange-400/30 text-orange-400',
    'Bu Hafta': 'border-gold/30 text-gold',
    'Diğer': 'border-border text-text-muted',
    'Tamamlandı / İptal': 'border-border text-text-dim',
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold">
          Görevler
          {todolar && <span className="text-sm font-normal text-text-muted ml-2">({todolar.length})</span>}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={csvDisaAktar}
            className="px-3 py-2 bg-surface border border-border text-text-muted font-medium rounded-lg text-xs hover:text-text hover:border-gold transition-colors"
          >
            📥 Dışa Aktar
          </button>
          <button
            onClick={() => topluSecim ? topluSecimKapat() : setTopluSecim(true)}
            className={`px-3 py-2 font-medium rounded-lg text-xs transition-colors ${
              topluSecim ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-surface border border-border text-text-muted hover:text-text hover:border-gold'
            }`}
          >
            {topluSecim ? 'Toplu Modu Kapat' : 'Toplu İşlem'}
          </button>
          {ekleYetkisi && (
            <button
              onClick={() => { setSeciliGorev(null); setModalAcik(true); }}
              className="px-4 py-2 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
            >
              + Yeni Görev
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        <MiniKpi label="Toplam" value={kpis.toplam} />
        <MiniKpi label="Bekliyor" value={kpis.bekliyor} color="text-orange-400" />
        <MiniKpi label="Devam Ediyor" value={kpis.devam} color="text-blue-400" />
        <MiniKpi label="Tamamlandı" value={kpis.tamamlandi} color="text-green" />
        <MiniKpi label="Gecikmiş" value={kpis.gecikmisSayi} color="text-red" />
        <MiniKpi label="Bana Atanan" value={kpis.banaAtanan} color="text-purple-400" />
      </div>

      {/* Arama + Filtre */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 relative">
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Görev ara..."
            className="w-full px-4 py-2.5 pl-9 bg-surface border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim text-sm">🔍</span>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([['aktif', 'Aktif'], ['bana_atanan', 'Bana Atanan'], ['hepsi', 'Tümü'], ['tamamlandi', 'Tamamlanan']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltre(key as typeof filtre)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                filtre === key ? 'bg-gold text-bg' : 'bg-surface text-text-muted hover:text-text hover:bg-surface2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={siralama}
          onChange={(e) => setSiralama(e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border rounded-lg text-xs text-text-muted focus:outline-none focus:border-gold transition-colors cursor-pointer"
        >
          <option value="">Varsayılan Sıralama</option>
          <option value="tarih_asc">Son Tarih (Yakın → Uzak)</option>
          <option value="tarih_desc">Son Tarih (Uzak → Yakın)</option>
          <option value="oncelik">Öncelik (Yüksek → Düşük)</option>
          <option value="baslik">Başlık (A-Z)</option>
          <option value="olusturma">Oluşturma Tarihi (Yeni → Eski)</option>
        </select>
        <QuickDateChips value={tarihChip} onChange={(key, b, bt) => { setTarihChip(key); setTarihBaslangic(b); setTarihBitis(bt); }} />
      </div>

      {/* Toplu Secim: Tümünü Seç / Seçimi Kaldır */}
      {topluSecim && (
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => {
              const gorunur = tumGorunurIds();
              if (seciliIds.size === gorunur.length && gorunur.length > 0) {
                setSeciliIds(new Set());
              } else {
                setSeciliIds(new Set(gorunur));
              }
            }}
            className="px-3 py-1.5 text-xs font-medium bg-surface border border-border rounded-lg text-text-muted hover:text-text hover:border-gold transition-colors"
          >
            {seciliIds.size > 0 && seciliIds.size === tumGorunurIds().length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
          </button>
          <span className="text-xs text-text-dim">{seciliIds.size} görev seçili</span>
        </div>
      )}

      {/* Gruplandırılmış Görevler */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={3} />
      ) : (
        <div className="space-y-4 flex-1">
          {Array.from(gruplar.entries()).map(([grupAd, gorevler]) => {
            if (gorevler.length === 0) return null;
            return (
              <div key={grupAd}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-2 pl-1 ${GRUP_RENK[grupAd] || 'text-text-muted'}`}>
                  {grupAd} ({gorevler.length})
                </div>
                <div className="space-y-1.5">
                  {gorevler.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => { setSeciliGorev(t); setModalAcik(true); }}
                      className={`flex items-start gap-3 bg-surface border border-border rounded-lg p-3.5 hover:border-gold transition-colors cursor-pointer group ${
                        t.durum === 'Tamamlandı' ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      {topluSecim ? (
                        <div
                          onClick={(e) => { e.stopPropagation(); topluSecimToggle(t.id); }}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${
                            seciliIds.has(t.id) ? 'bg-gold border-gold' : 'border-border hover:border-gold'
                          }`}
                        >
                          {seciliIds.has(t.id) && <span className="text-[10px] text-bg">✓</span>}
                        </div>
                      ) : (
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleTamamla(t); }}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center cursor-pointer transition-colors ${
                            t.durum === 'Tamamlandı' ? 'bg-green border-green' : 'border-border hover:border-gold'
                          }`}
                        >
                          {t.durum === 'Tamamlandı' && <span className="text-[10px] text-bg">✓</span>}
                        </div>
                      )}

                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-sm font-medium ${t.durum === 'Tamamlandı' ? 'line-through text-text-dim' : 'text-text'}`}>
                            {t.baslik || '—'}
                          </span>
                          {t.oncelik && (
                            <span className="text-[10px]">{ONCELIK_RENK[t.oncelik]?.icon || ''}</span>
                          )}
                          {t.tekrar && t.tekrar !== 'yok' && (
                            <span className="text-[10px] text-text-dim">🔄 {
                              t.tekrar === 'gunluk' ? 'Günlük' :
                              t.tekrar === 'haftalik' ? 'Haftalık' :
                              t.tekrar === 'aylik' ? 'Aylık' : 'Yıllık'
                            }</span>
                          )}
                        </div>
                        {t.aciklama && (
                          <div className="text-[11px] text-text-muted truncate">{t.aciklama}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {t.durum && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${DURUM_RENK[t.durum] || ''}`}>
                              {t.durum}
                            </span>
                          )}
                          {t.muvId && muvAdMap[t.muvId] && (
                            <span className="text-[10px] text-text-dim">👤 {muvAdMap[t.muvId]}</span>
                          )}
                          {t.dosyaTur && (
                            <span className="text-[10px] text-text-dim">📂 {t.dosyaTur}</span>
                          )}
                          {t.atananId && (personelAdMap[t.atananId] || (t as any).atananAd) && (
                            <span className="text-[10px] text-purple-400">🎯 {personelAdMap[t.atananId] || (t as any).atananAd}</span>
                          )}
                          {t.kategori && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface2 text-text-muted border border-border">
                              {t.kategori}
                            </span>
                          )}
                          {(t as any).altGorevler?.length > 0 && (() => {
                            const alts = (t as any).altGorevler as { tamam: boolean }[];
                            const done = alts.filter(a => a.tamam).length;
                            return (
                              <span className="text-[10px] text-text-dim">
                                ☑ {done}/{alts.length}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Son Tarih */}
                      <div className="text-right flex-shrink-0">
                        {t.sonTarih ? (
                          <div className={`text-[11px] font-medium ${
                            (() => {
                              const bugunStr = new Date().toISOString().split('T')[0];
                              if (t.durum === 'Tamamlandı' || t.durum === 'İptal') return 'text-text-dim';
                              if (t.sonTarih! < bugunStr) return 'text-red';
                              if (t.sonTarih === bugunStr) return 'text-orange-400';
                              return 'text-text-muted';
                            })()
                          }`}>
                            {fmtTarih(t.sonTarih)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-text-dim">Tarih yok</div>
                        )}
                      </div>

                      {/* Sil Butonu */}
                      {silYetkisi && (
                        <div className="flex-shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                          {silOnayId === t.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => gorevSil(t.id)}
                                disabled={todoSil.isPending}
                                className="px-2 py-1 text-[10px] font-bold bg-red/10 text-red border border-red/20 rounded hover:bg-red/20 transition-colors disabled:opacity-50"
                              >
                                {todoSil.isPending ? '...' : 'Sil'}
                              </button>
                              <button
                                onClick={() => setSilOnayId(null)}
                                className="px-2 py-1 text-[10px] font-bold bg-surface2 text-text-muted border border-border rounded hover:text-text transition-colors"
                              >
                                Vazgeç
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSilOnayId(t.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-text-dim opacity-0 group-hover:opacity-100 hover:bg-red/10 hover:text-red transition-all"
                              title="Görevi sil"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toplu İşlem Floating Bar */}
      {topluSecim && seciliIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-surface border border-border rounded-xl px-5 py-3 shadow-lg shadow-black/20">
          <span className="text-xs font-semibold text-text">{seciliIds.size} seçili</span>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => topluDurumDegistir('Tamamlandı')}
            className="px-3 py-1.5 text-xs font-medium bg-green-dim text-green border border-green/20 rounded-lg hover:bg-green/20 transition-colors"
          >
            Tamamla
          </button>
          {silYetkisi && (
            <button
              onClick={topluSilme}
              className="px-3 py-1.5 text-xs font-medium bg-red/10 text-red border border-red/20 rounded-lg hover:bg-red/20 transition-colors"
            >
              Sil
            </button>
          )}
          <button
            onClick={() => topluDurumDegistir('İptal')}
            className="px-3 py-1.5 text-xs font-medium bg-surface2 text-text-muted border border-border rounded-lg hover:text-text transition-colors"
          >
            İptal Et
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={topluSecimKapat}
            className="px-3 py-1.5 text-xs font-medium text-text-dim hover:text-text transition-colors"
          >
            Vazgeç
          </button>
        </div>
      )}

      <GorevModal open={modalAcik} onClose={() => setModalAcik(false)} gorev={seciliGorev} />
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`font-[var(--font-playfair)] text-xl font-bold ${color || 'text-text'}`}>{value}</div>
    </div>
  );
}
