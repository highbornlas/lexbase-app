'use client';

import { useState } from 'react';
import { useAdminLisanslar, useAdminPlanlar, useAdminAuditYaz } from '@/lib/hooks/useAdmin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Lisans Kodu Yönetimi
   Toplu kod üretimi, durum takibi, kopyalama
   ══════════════════════════════════════════════════════════════ */

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return segments.join('-');
}

function useLisansOlustur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kodlar: Array<{ kod: string; plan_id: string; sure_gun: number; max_kullanim: number }>) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('lisans_kodlari').insert(
        kodlar.map((k) => ({ ...k, olusturan_admin: user?.id }))
      );
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'lisanslar'] }),
  });
}

const DURUM_BADGE: Record<string, { renk: string; etiket: string }> = {
  aktif: { renk: 'bg-emerald-500/10 text-emerald-400', etiket: 'Aktif' },
  kullanildi: { renk: 'bg-blue-500/10 text-blue-400', etiket: 'Kullanıldı' },
  iptal: { renk: 'bg-red-500/10 text-red-400', etiket: 'İptal' },
  suresi_doldu: { renk: 'bg-zinc-700/50 text-zinc-400', etiket: 'Süresi Doldu' },
};

export default function LisanslarPage() {
  const { data: lisanslar, isLoading } = useAdminLisanslar();
  const { data: planlar } = useAdminPlanlar();
  const lisansOlustur = useLisansOlustur();
  const auditYaz = useAdminAuditYaz();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ plan_id: 'profesyonel', sure_gun: 30, adet: 1, max_kullanim: 1 });
  const [kopyalandi, setKopyalandi] = useState<string | null>(null);

  const handleOlustur = () => {
    const kodlar = Array.from({ length: form.adet }, () => ({
      kod: generateCode(),
      plan_id: form.plan_id,
      sure_gun: form.sure_gun,
      max_kullanim: form.max_kullanim,
    }));
    lisansOlustur.mutate(kodlar, {
      onSuccess: () => {
        auditYaz.mutate({ islem: 'lisans_olustur', hedef_tablo: 'lisans_kodlari', detay: { adet: form.adet, plan: form.plan_id } });
        setModalOpen(false);
      },
    });
  };

  const handleKopyala = (kod: string) => {
    navigator.clipboard.writeText(kod);
    setKopyalandi(kod);
    setTimeout(() => setKopyalandi(null), 2000);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">🔑 Lisans Kodları</h1>
          <p className="text-[11px] text-zinc-600">Lisans kodu oluştur ve yönet</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
          + Kod Oluştur
        </button>
      </div>

      {/* Tablo */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-900/50 border border-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Kod</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Plan</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase hidden md:table-cell">Süre</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Durum</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase hidden md:table-cell">Kullanım</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Kopyala</th>
              </tr>
            </thead>
            <tbody>
              {(lisanslar || []).map((lis: Record<string, unknown>) => {
                const plan = (lis.plan || {}) as Record<string, unknown>;
                const durumInfo = DURUM_BADGE[lis.durum as string] || DURUM_BADGE.aktif;
                return (
                  <tr key={lis.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-amber-500 font-mono font-bold tracking-wider">{lis.kod as string}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-400">{plan.ad as string || lis.plan_id as string}</td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500 hidden md:table-cell">{lis.sure_gun as number} gün</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${durumInfo.renk}`}>{durumInfo.etiket}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-zinc-500 hidden md:table-cell">
                      {lis.kullanim_sayisi as number}/{lis.max_kullanim as number}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleKopyala(lis.kod as string)}
                        className={`text-[10px] px-2 py-1 rounded transition-all ${
                          kopyalandi === lis.kod ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-600 hover:text-amber-500'
                        }`}>
                        {kopyalandi === lis.kod ? '✓ Kopyalandı' : '📋'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!lisanslar || lisanslar.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[12px] text-zinc-600">Henüz lisans kodu oluşturulmamış</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Oluşturma Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-[#0d0f14] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold text-zinc-200">🔑 Lisans Kodu Oluştur</h2>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Plan</label>
                <select value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                  {(planlar || []).map((p: Record<string, unknown>) => (
                    <option key={p.plan_id as string} value={p.plan_id as string}>{p.ad as string}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Süre (gün)</label>
                <select value={form.sure_gun} onChange={(e) => setForm({ ...form, sure_gun: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                  <option value={30}>30 gün</option>
                  <option value={90}>90 gün</option>
                  <option value={180}>180 gün</option>
                  <option value={365}>1 yıl</option>
                  <option value={36500}>Ömür Boyu</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Adet</label>
                <select value={form.adet} onChange={(e) => setForm({ ...form, adet: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                  {[1, 5, 10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n} adet</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">
                İptal
              </button>
              <button onClick={handleOlustur} disabled={lisansOlustur.isPending}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                {lisansOlustur.isPending ? 'Oluşturuluyor...' : `🔑 ${form.adet} Kod Oluştur`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
