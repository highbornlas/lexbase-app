'use client';

import { useState } from 'react';
import { useAdminDuyurular, useAdminAuditYaz } from '@/lib/hooks/useAdmin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Duyuru Yönetimi
   Platform geneli duyuru oluştur, düzenle, yayınla
   ══════════════════════════════════════════════════════════════ */

const TIP_ICON: Record<string, { icon: string; renk: string }> = {
  bilgi: { icon: 'ℹ️', renk: 'border-blue-500/20 bg-blue-500/5' },
  uyari: { icon: '⚠️', renk: 'border-amber-500/20 bg-amber-500/5' },
  guncelleme: { icon: '🔄', renk: 'border-emerald-500/20 bg-emerald-500/5' },
  bakim: { icon: '🔧', renk: 'border-red-500/20 bg-red-500/5' },
};

interface DuyuruForm {
  baslik: string;
  icerik: string;
  tip: string;
  durum: string;
  bitis_tarihi: string;
}

function useDuyuruKaydet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (duyuru: Record<string, unknown>) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('platform_duyurular').insert({
        ...duyuru,
        olusturan_admin: user?.id,
        yayinlanma_tarihi: duyuru.durum === 'aktif' ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'duyurular'] }),
  });
}

function useDuyuruDurumGuncelle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, durum }: { id: string; durum: string }) => {
      const supabase = createClient();
      const guncellemeler: Record<string, unknown> = { durum, updated_at: new Date().toISOString() };
      if (durum === 'aktif') guncellemeler.yayinlanma_tarihi = new Date().toISOString();
      const { error } = await supabase.from('platform_duyurular').update(guncellemeler).eq('id', id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'duyurular'] }),
  });
}

export default function DuyurularPage() {
  const { data: duyurular, isLoading } = useAdminDuyurular();
  const duyuruKaydet = useDuyuruKaydet();
  const durumGuncelle = useDuyuruDurumGuncelle();
  const auditYaz = useAdminAuditYaz();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<DuyuruForm>({
    baslik: '', icerik: '', tip: 'bilgi', durum: 'aktif',
    bitis_tarihi: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  });

  const handleKaydet = () => {
    duyuruKaydet.mutate({
      baslik: form.baslik, icerik: form.icerik, tip: form.tip,
      durum: form.durum, bitis_tarihi: form.bitis_tarihi || null,
    }, {
      onSuccess: () => {
        auditYaz.mutate({ islem: 'duyuru_olustur', hedef_tablo: 'platform_duyurular', detay: { baslik: form.baslik } });
        setModalOpen(false);
        setForm({ baslik: '', icerik: '', tip: 'bilgi', durum: 'aktif', bitis_tarihi: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16) });
      },
    });
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-200">📢 Duyurular</h1>
          <p className="text-[11px] text-zinc-600">Platform geneli duyuru yönetimi</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
          + Duyuru Yayınla
        </button>
      </div>

      {/* Duyuru Listesi */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(duyurular || []).map((d: Record<string, unknown>) => {
            const tipInfo = TIP_ICON[d.tip as string] || TIP_ICON.bilgi;
            return (
              <div key={d.id as string} className={`rounded-xl border p-4 ${tipInfo.renk}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{tipInfo.icon}</span>
                      <h3 className="text-[13px] font-bold text-zinc-200">{d.baslik as string}</h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        d.durum === 'aktif' ? 'bg-emerald-500/10 text-emerald-400' :
                        d.durum === 'taslak' ? 'bg-zinc-700 text-zinc-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>{d.durum as string}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-2">{d.icerik as string}</p>
                    <div className="flex gap-3 mt-2 text-[10px] text-zinc-600">
                      <span>📅 {d.created_at ? new Date(d.created_at as string).toLocaleDateString('tr-TR') : '—'}</span>
                      {!!d.bitis_tarihi && <span>⏰ Bitiş: {new Date(String(d.bitis_tarihi)).toLocaleDateString('tr-TR')}</span>}
                      <span>👁 {Number(d.okunma_sayisi) || 0} görüntülenme</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {d.durum === 'taslak' && (
                      <button onClick={() => durumGuncelle.mutate({ id: d.id as string, durum: 'aktif' })}
                        className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                        Yayınla
                      </button>
                    )}
                    {d.durum === 'aktif' && (
                      <button onClick={() => durumGuncelle.mutate({ id: d.id as string, durum: 'suresi_doldu' })}
                        className="text-[10px] px-2 py-1 rounded bg-zinc-700 text-zinc-400 hover:bg-zinc-600 transition-all">
                        Kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {(!duyurular || duyurular.length === 0) && (
            <div className="text-center py-8 text-[12px] text-zinc-600">Henüz duyuru yok</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-[#0d0f14] border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-bold text-zinc-200">📢 Yeni Duyuru</h2>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Başlık</label>
                <input value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">İçerik</label>
                <textarea value={form.icerik} onChange={(e) => setForm({ ...form, icerik: e.target.value })} rows={4}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Tip</label>
                  <select value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                    <option value="bilgi">ℹ️ Bilgi</option>
                    <option value="uyari">⚠️ Uyarı</option>
                    <option value="guncelleme">🔄 Güncelleme</option>
                    <option value="bakim">🔧 Bakım</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Durum</label>
                  <select value={form.durum} onChange={(e) => setForm({ ...form, durum: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none">
                    <option value="aktif">Hemen Yayınla</option>
                    <option value="taslak">Taslak Olarak Kaydet</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase mb-1 block">Bitiş Tarihi</label>
                <input type="datetime-local" value={form.bitis_tarihi} onChange={(e) => setForm({ ...form, bitis_tarihi: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 focus:border-amber-500/50 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">İptal</button>
              <button onClick={handleKaydet} disabled={!form.baslik || !form.icerik || duyuruKaydet.isPending}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                {duyuruKaydet.isPending ? 'Kaydediliyor...' : '📢 Yayınla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
