'use client';

import { useState } from 'react';
import { useAdminPlanlar, useAdminPlanKaydet, useAdminAuditYaz } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin — Plan & Fiyat Yönetimi
   Paket özelliklerini, limitlerini ve fiyatlarını yönetme
   ══════════════════════════════════════════════════════════════ */

interface PlanForm {
  plan_id: string;
  ad: string;
  aciklama: string;
  personel_limit: number;
  dava_limit: number;
  muvekkil_limit: number;
  icra_limit: number;
  max_depolama_mb: number;
  max_belge: number;
  fiyat_aylik: number;
  fiyat_yillik: number;
  aktif: boolean;
  ozel_plan: boolean;
  ozellikler: Record<string, boolean>;
}

const BOS_PLAN: PlanForm = {
  plan_id: '', ad: '', aciklama: '', personel_limit: 3, dava_limit: 50,
  muvekkil_limit: 30, icra_limit: 30, max_depolama_mb: 500, max_belge: 200,
  fiyat_aylik: 0, fiyat_yillik: 0, aktif: true, ozel_plan: false,
  ozellikler: { finans: true, raporlar: false, api: false, toplu_islem: false },
};

const OZELLIK_ETIKETLER: Record<string, string> = {
  finans: 'Finans Modülü',
  raporlar: 'Raporlar & Export',
  api: 'API Erişimi',
  toplu_islem: 'Toplu İşlemler',
  ozel_destek: 'Özel Destek',
};

export default function PlanlarPage() {
  const { data: planlar, isLoading } = useAdminPlanlar();
  const planKaydet = useAdminPlanKaydet();
  const auditYaz = useAdminAuditYaz();
  const [duzenle, setDuzenle] = useState<PlanForm | null>(null);

  const handlePlanAc = (plan?: Record<string, unknown>) => {
    if (plan) {
      setDuzenle({
        plan_id: plan.plan_id as string,
        ad: plan.ad as string || '',
        aciklama: plan.aciklama as string || '',
        personel_limit: plan.personel_limit as number || 3,
        dava_limit: plan.dava_limit as number || 50,
        muvekkil_limit: plan.muvekkil_limit as number || 30,
        icra_limit: plan.icra_limit as number || 30,
        max_depolama_mb: plan.max_depolama_mb as number || 500,
        max_belge: plan.max_belge as number || 200,
        fiyat_aylik: Number(plan.fiyat_aylik) || 0,
        fiyat_yillik: Number(plan.fiyat_yillik) || 0,
        aktif: plan.aktif as boolean ?? true,
        ozel_plan: plan.ozel_plan as boolean ?? false,
        ozellikler: (plan.ozellikler || {}) as Record<string, boolean>,
      });
    } else {
      setDuzenle({ ...BOS_PLAN, plan_id: `ozel_${Date.now()}`, ozel_plan: true });
    }
  };

  const handleKaydet = () => {
    if (!duzenle) return;
    planKaydet.mutate(duzenle as unknown as Record<string, unknown>, {
      onSuccess: () => {
        auditYaz.mutate({ islem: 'plan_guncelle', hedef_tablo: 'plan_limitleri', hedef_kayit_id: duzenle.plan_id });
        setDuzenle(null);
      },
    });
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">📦 Planlar & Fiyatlar</h1>
          <p className="text-[11px] text-zinc-600">Paket özelliklerini ve fiyatlarını yönet</p>
        </div>
        <button
          onClick={() => handlePlanAc()}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
        >
          + Özel Plan Oluştur
        </button>
      </div>

      {/* Plan Kartları */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-60 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {(planlar || []).map((plan: Record<string, unknown>) => {
            const ozellikler = (plan.ozellikler || {}) as Record<string, boolean>;
            return (
              <div
                key={plan.plan_id as string}
                className={`rounded-xl border p-4 transition-all hover:border-amber-500/30 ${
                  plan.aktif ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-800/50 bg-zinc-900/10 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-bold text-zinc-200">{plan.ad as string}</h3>
                  {!!plan.ozel_plan && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">ÖZEL</span>
                  )}
                </div>

                <p className="text-[10px] text-zinc-500 mb-3 min-h-[28px]">{plan.aciklama as string || '—'}</p>

                {/* Fiyat */}
                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-amber-500 font-[var(--font-playfair)]">
                      {Number(plan.fiyat_aylik) > 0 ? `₺${Number(plan.fiyat_aylik)}` : 'Ücretsiz'}
                    </span>
                    {Number(plan.fiyat_aylik) > 0 && <span className="text-[10px] text-zinc-600">/ay</span>}
                  </div>
                  {Number(plan.fiyat_yillik) > 0 && (
                    <div className="text-[10px] text-zinc-600">₺{Number(plan.fiyat_yillik).toLocaleString('tr-TR')}/yıl</div>
                  )}
                </div>

                {/* Limitler */}
                <div className="space-y-1 mb-3 text-[10px]">
                  <div className="flex justify-between"><span className="text-zinc-600">Personel</span><span className="text-zinc-400">{Number(plan.personel_limit)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">Dava</span><span className="text-zinc-400">{Number(plan.dava_limit)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">Müvekkil</span><span className="text-zinc-400">{Number(plan.muvekkil_limit)}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">Depolama</span><span className="text-zinc-400">{Number(plan.max_depolama_mb)} MB</span></div>
                </div>

                {/* Özellikler */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {Object.entries(ozellikler).map(([key, val]) => (
                    <span key={key} className={`text-[8px] px-1.5 py-0.5 rounded ${val ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-600 line-through'}`}>
                      {OZELLIK_ETIKETLER[key] || key}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handlePlanAc(plan)}
                  className="w-full py-1.5 rounded-lg text-[11px] font-medium border border-zinc-700 text-zinc-500 hover:border-amber-500/50 hover:text-amber-500 transition-all"
                >
                  ✏️ Düzenle
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Düzenleme Modal */}
      {duzenle && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDuzenle(null)}>
          <div className="bg-[#0d0f14] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold text-zinc-200">
              {duzenle.ozel_plan && !planlar?.find((p: Record<string, unknown>) => p.plan_id === duzenle.plan_id) ? '➕ Yeni Özel Plan' : '✏️ Plan Düzenle'}
            </h2>

            {/* Form */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Plan Adı</label>
                <input value={duzenle.ad} onChange={(e) => setDuzenle({ ...duzenle, ad: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Açıklama</label>
                <input value={duzenle.aciklama} onChange={(e) => setDuzenle({ ...duzenle, aciklama: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
              </div>

              {/* Fiyatlar */}
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Aylık Fiyat (₺)</label>
                <input type="number" value={duzenle.fiyat_aylik} onChange={(e) => setDuzenle({ ...duzenle, fiyat_aylik: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Yıllık Fiyat (₺)</label>
                <input type="number" value={duzenle.fiyat_yillik} onChange={(e) => setDuzenle({ ...duzenle, fiyat_yillik: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
              </div>

              {/* Limitler */}
              {[
                { key: 'personel_limit', label: 'Personel Limiti' },
                { key: 'dava_limit', label: 'Dava Limiti' },
                { key: 'muvekkil_limit', label: 'Müvekkil Limiti' },
                { key: 'icra_limit', label: 'İcra Limiti' },
                { key: 'max_depolama_mb', label: 'Depolama (MB)' },
                { key: 'max_belge', label: 'Belge Limiti' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-[10px] text-zinc-600 uppercase mb-1 block">{label}</label>
                  <input type="number" value={(duzenle as unknown as Record<string, number>)[key]}
                    onChange={(e) => setDuzenle({ ...duzenle, [key]: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
                </div>
              ))}
            </div>

            {/* Özellikler Toggle */}
            <div>
              <label className="text-[10px] text-zinc-600 uppercase mb-2 block">Özellikler</label>
              <div className="space-y-2">
                {Object.entries(OZELLIK_ETIKETLER).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={duzenle.ozellikler[key] || false}
                      onChange={(e) => setDuzenle({
                        ...duzenle,
                        ozellikler: { ...duzenle.ozellikler, [key]: e.target.checked },
                      })}
                      className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500/30"
                    />
                    <span className="text-[12px] text-zinc-400">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Aktif toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={duzenle.aktif}
                onChange={(e) => setDuzenle({ ...duzenle, aktif: e.target.checked })}
                className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500/30" />
              <span className="text-[12px] text-zinc-400">Plan Aktif</span>
            </label>

            {/* Butonlar */}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDuzenle(null)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">
                İptal
              </button>
              <button onClick={handleKaydet} disabled={planKaydet.isPending}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                {planKaydet.isPending ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
