'use client';

import { useState } from 'react';
import { useAdminIndirimler, useAdminPlanlar, useAdminAuditYaz } from '@/lib/hooks/useAdmin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — İndirim & Kampanya Yönetimi
   Süreli indirimler, kupon kodları, kampanyalar
   ══════════════════════════════════════════════════════════════ */

interface IndirimForm {
  ad: string;
  indirim_tipi: 'yuzde' | 'sabit';
  indirim_degeri: number;
  plan_id: string;
  baslangic: string;
  bitis: string;
  kupon_kodu: string;
  max_kullanim: number | null;
}

const BOS_FORM: IndirimForm = {
  ad: '', indirim_tipi: 'yuzde', indirim_degeri: 20, plan_id: '',
  baslangic: new Date().toISOString().slice(0, 16),
  bitis: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
  kupon_kodu: '', max_kullanim: null,
};

function useIndirimKaydet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (indirim: Record<string, unknown>) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('platform_indirimler').insert({
        ...indirim,
        olusturan_admin: user?.id,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'indirimler'] }),
  });
}

export default function IndirimlerPage() {
  const { data: indirimler, isLoading } = useAdminIndirimler();
  const { data: planlar } = useAdminPlanlar();
  const indirimKaydet = useIndirimKaydet();
  const auditYaz = useAdminAuditYaz();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<IndirimForm>(BOS_FORM);

  const handleKaydet = () => {
    const kayit: Record<string, unknown> = {
      ad: form.ad,
      indirim_tipi: form.indirim_tipi,
      indirim_degeri: form.indirim_degeri,
      plan_id: form.plan_id || null,
      baslangic: form.baslangic,
      bitis: form.bitis,
      kupon_kodu: form.kupon_kodu || null,
      max_kullanim: form.max_kullanim,
    };
    indirimKaydet.mutate(kayit, {
      onSuccess: () => {
        auditYaz.mutate({ islem: 'indirim_olustur', hedef_tablo: 'platform_indirimler', detay: { ad: form.ad } });
        setForm(BOS_FORM);
        setModalOpen(false);
      },
    });
  };

  const now = Date.now();

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">🏷️ İndirimler & Kampanyalar</h1>
          <p className="text-[11px] text-zinc-600">Süreli indirimler ve kupon kodları oluştur</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
          + Yeni İndirim
        </button>
      </div>

      {/* Kartlar */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(indirimler || []).map((ind: Record<string, unknown>) => {
            const aktif = ind.aktif && new Date(ind.baslangic as string).getTime() <= now && new Date(ind.bitis as string).getTime() > now;
            return (
              <div key={ind.id as string} className={`rounded-xl border p-4 transition-all ${
                aktif ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/30 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-bold text-zinc-200">{ind.ad as string}</h3>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    aktif ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {aktif ? 'AKTİF' : 'PASİF'}
                  </span>
                </div>

                <div className="text-2xl font-bold text-amber-500 font-[var(--font-playfair)] mb-2">
                  {ind.indirim_tipi === 'yuzde' ? `%${ind.indirim_degeri}` : `₺${ind.indirim_degeri}`}
                  <span className="text-[11px] text-zinc-500 font-normal ml-1">indirim</span>
                </div>

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Dönem</span>
                    <span className="text-zinc-400">
                      {new Date(ind.baslangic as string).toLocaleDateString('tr-TR')} — {new Date(ind.bitis as string).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  {!!ind.kupon_kodu && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Kupon</span>
                      <span className="text-amber-500 font-mono font-bold">{String(ind.kupon_kodu)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Kullanım</span>
                    <span className="text-zinc-400">{Number(ind.kullanim_sayisi)}/{ind.max_kullanim ? String(ind.max_kullanim) : '∞'}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {(!indirimler || indirimler.length === 0) && (
            <div className="col-span-2 text-center py-8 text-[12px] text-zinc-600">Henüz indirim tanımlanmamış</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-[#0d0f14] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold text-zinc-200">🏷️ Yeni İndirim Oluştur</h2>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Kampanya Adı</label>
                <input value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })}
                  placeholder="Yeni Yıl Kampanyası"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Tip</label>
                  <select value={form.indirim_tipi} onChange={(e) => setForm({ ...form, indirim_tipi: e.target.value as 'yuzde' | 'sabit' })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                    <option value="yuzde">Yüzde (%)</option>
                    <option value="sabit">Sabit (₺)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Değer</label>
                  <input type="number" value={form.indirim_degeri} onChange={(e) => setForm({ ...form, indirim_degeri: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Plan (boş = tüm planlar)</label>
                <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                  <option value="">Tüm Planlar</option>
                  {(planlar || []).map((p: Record<string, unknown>) => (
                    <option key={p.plan_id as string} value={p.plan_id as string}>{p.ad as string}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Başlangıç</label>
                  <input type="datetime-local" value={form.baslangic} onChange={(e) => setForm({ ...form, baslangic: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Bitiş</label>
                  <input type="datetime-local" value={form.bitis} onChange={(e) => setForm({ ...form, bitis: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Kupon Kodu (opsiyonel)</label>
                <input value={form.kupon_kodu} onChange={(e) => setForm({ ...form, kupon_kodu: e.target.value.toUpperCase() })}
                  placeholder="LEXBASE2026"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 font-mono placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">İptal</button>
              <button onClick={handleKaydet} disabled={!form.ad || indirimKaydet.isPending}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                {indirimKaydet.isPending ? 'Kaydediliyor...' : '🏷️ Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
