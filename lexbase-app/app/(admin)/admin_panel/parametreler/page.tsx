'use client';

import { useState } from 'react';
import { useAdminParametreler, useAdminAuditYaz } from '@/lib/hooks/useAdmin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Merkezi Hukuki Parametreler
   Yasal faiz, asgari ücret, harçlar vb. platform geneli değerler
   Değişiklik yapıldığında tüm büroların hesaplamaları otomatik güncellenir
   ══════════════════════════════════════════════════════════════ */

const KATEGORI_ICON: Record<string, string> = {
  faiz: '📊',
  ucret: '💰',
  vergi: '🏛️',
  genel: '⚙️',
};

function useParametreGuncelle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ anahtar, deger }: { anahtar: string; deger: unknown }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('platform_parametreler').update({
        deger,
        guncelleme_tarihi: new Date().toISOString(),
        guncelleyen_admin: user?.id,
      }).eq('anahtar', anahtar);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'parametreler'] }),
  });
}

function useParametreEkle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (parametre: Record<string, unknown>) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('platform_parametreler').insert({
        ...parametre,
        guncelleyen_admin: user?.id,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'parametreler'] }),
  });
}

export default function ParametrelerPage() {
  const { data: parametreler, isLoading } = useAdminParametreler();
  const parametreGuncelle = useParametreGuncelle();
  const parametreEkle = useParametreEkle();
  const auditYaz = useAdminAuditYaz();

  const [duzenleAnahtar, setDuzenleAnahtar] = useState<string | null>(null);
  const [duzenleJSON, setDuzenleJSON] = useState('');
  const [yeniModal, setYeniModal] = useState(false);
  const [yeniForm, setYeniForm] = useState({ anahtar: '', aciklama: '', kategori: 'genel', deger: '{}' });

  const handleDuzenleBasla = (anahtar: string, deger: unknown) => {
    setDuzenleAnahtar(anahtar);
    setDuzenleJSON(JSON.stringify(deger, null, 2));
  };

  const handleKaydet = () => {
    if (!duzenleAnahtar) return;
    try {
      const parsed = JSON.parse(duzenleJSON);
      parametreGuncelle.mutate({ anahtar: duzenleAnahtar, deger: parsed }, {
        onSuccess: () => {
          auditYaz.mutate({ islem: 'parametre_guncelle', hedef_tablo: 'platform_parametreler', hedef_kayit_id: duzenleAnahtar });
          setDuzenleAnahtar(null);
        },
      });
    } catch {
      alert('Geçersiz JSON formatı');
    }
  };

  const handleYeniKaydet = () => {
    try {
      const parsed = JSON.parse(yeniForm.deger);
      parametreEkle.mutate({
        anahtar: yeniForm.anahtar,
        aciklama: yeniForm.aciklama,
        kategori: yeniForm.kategori,
        deger: parsed,
      }, {
        onSuccess: () => {
          auditYaz.mutate({ islem: 'parametre_ekle', hedef_tablo: 'platform_parametreler', hedef_kayit_id: yeniForm.anahtar });
          setYeniModal(false);
          setYeniForm({ anahtar: '', aciklama: '', kategori: 'genel', deger: '{}' });
        },
      });
    } catch {
      alert('Geçersiz JSON formatı');
    }
  };

  // Kategoriye göre grupla
  const kategoriler = new Map<string, Array<Record<string, unknown>>>();
  (parametreler || []).forEach((p: Record<string, unknown>) => {
    const kat = p.kategori as string || 'genel';
    if (!kategoriler.has(kat)) kategoriler.set(kat, []);
    kategoriler.get(kat)!.push(p);
  });

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">⚖️ Hukuki Parametreler</h1>
          <p className="text-[11px] text-zinc-600">
            Merkezi hukuk motoru — değişiklikler tüm bürolarda geçerli olur
          </p>
        </div>
        <button onClick={() => setYeniModal(true)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
          + Parametre Ekle
        </button>
      </div>

      {/* Uyarı */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-[11px] text-amber-400">
          ⚠️ Bu değerler tüm platformdaki finans ve icra hesaplamalarını etkiler. Değişiklikler anında uygulanır.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        [...kategoriler.entries()].map(([kategori, params]) => (
          <div key={kategori}>
            <h2 className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>{KATEGORI_ICON[kategori] || '📋'}</span>
              {kategori === 'faiz' ? 'Faiz Oranları' :
               kategori === 'ucret' ? 'Ücretler' :
               kategori === 'vergi' ? 'Vergi' : 'Genel'}
            </h2>
            <div className="space-y-2">
              {params.map((p) => {
                const deger = p.deger as Record<string, unknown>;
                return (
                  <div key={p.anahtar as string} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-[13px] font-bold text-zinc-200">
                          {(p.anahtar as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </h3>
                        <p className="text-[10px] text-zinc-600 mt-0.5">{p.aciklama as string || '—'}</p>

                        {/* Değer önizleme */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(deger).map(([k, v]) => (
                            <div key={k} className="px-2 py-1 rounded bg-zinc-800/50">
                              <span className="text-[9px] text-zinc-600">{k}: </span>
                              <span className="text-[11px] text-amber-500 font-medium">{String(v)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="text-[9px] text-zinc-700 mt-2">
                          Son güncelleme: {p.guncelleme_tarihi ? new Date(p.guncelleme_tarihi as string).toLocaleString('tr-TR') : '—'}
                        </div>
                      </div>
                      <button onClick={() => handleDuzenleBasla(p.anahtar as string, deger)}
                        className="text-[10px] px-2.5 py-1 rounded-lg border border-zinc-700 text-zinc-500 hover:border-amber-500/50 hover:text-amber-500 transition-all flex-shrink-0">
                        ✏️ Düzenle
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Düzenleme Modal */}
      {duzenleAnahtar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDuzenleAnahtar(null)}>
          <div className="bg-[#0d0f14] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold text-zinc-200">
              ✏️ {duzenleAnahtar.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </h2>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Değer (JSON)</label>
              <textarea value={duzenleJSON} onChange={(e) => setDuzenleJSON(e.target.value)} rows={8}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 font-mono focus:border-amber-500/50 focus:outline-none resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDuzenleAnahtar(null)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">İptal</button>
              <button onClick={handleKaydet} disabled={parametreGuncelle.isPending}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                {parametreGuncelle.isPending ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Parametre Modal */}
      {yeniModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setYeniModal(false)}>
          <div className="bg-[#0d0f14] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold text-zinc-200">➕ Yeni Parametre Ekle</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Anahtar (snake_case)</label>
                <input value={yeniForm.anahtar} onChange={(e) => setYeniForm({ ...yeniForm, anahtar: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="yeni_parametre"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 font-mono placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Açıklama</label>
                <input value={yeniForm.aciklama} onChange={(e) => setYeniForm({ ...yeniForm, aciklama: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Kategori</label>
                <select value={yeniForm.kategori} onChange={(e) => setYeniForm({ ...yeniForm, kategori: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                  <option value="genel">Genel</option>
                  <option value="faiz">Faiz</option>
                  <option value="ucret">Ücret</option>
                  <option value="vergi">Vergi</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Değer (JSON)</label>
                <textarea value={yeniForm.deger} onChange={(e) => setYeniForm({ ...yeniForm, deger: e.target.value })} rows={4}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 font-mono placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setYeniModal(false)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">İptal</button>
              <button onClick={handleYeniKaydet} disabled={!yeniForm.anahtar || parametreEkle.isPending}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                {parametreEkle.isPending ? 'Ekleniyor...' : '➕ Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
