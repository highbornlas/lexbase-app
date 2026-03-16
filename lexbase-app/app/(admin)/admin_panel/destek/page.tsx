'use client';

import { useState } from 'react';
import { useAdminDestekTalepleri, useAdminAuditYaz } from '@/lib/hooks/useAdmin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/* ══════════════════════════════════════════════════════════════
   Admin — Destek Talepleri
   Ticket yönetimi, yanıtlama, durum güncelleme
   ══════════════════════════════════════════════════════════════ */

const ONCELIK_BADGE: Record<string, { renk: string; etiket: string }> = {
  dusuk: { renk: 'bg-zinc-700 text-zinc-400', etiket: 'Düşük' },
  normal: { renk: 'bg-blue-500/10 text-blue-400', etiket: 'Normal' },
  yuksek: { renk: 'bg-amber-500/10 text-amber-400', etiket: 'Yüksek' },
  acil: { renk: 'bg-red-500/10 text-red-400', etiket: 'Acil' },
};

const DURUM_BADGE: Record<string, { renk: string; etiket: string }> = {
  bekliyor: { renk: 'bg-amber-500/10 text-amber-400', etiket: 'Bekliyor' },
  inceleniyor: { renk: 'bg-blue-500/10 text-blue-400', etiket: 'İnceleniyor' },
  cozuldu: { renk: 'bg-emerald-500/10 text-emerald-400', etiket: 'Çözüldü' },
  kapatildi: { renk: 'bg-zinc-700 text-zinc-400', etiket: 'Kapatıldı' },
};

function useDestekDurumGuncelle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, durum, yanit }: { id: string; durum?: string; yanit?: string }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const guncellemeler: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (durum) {
        guncellemeler.durum = durum;
        if (durum === 'cozuldu') guncellemeler.cozum_tarihi = new Date().toISOString();
        if (durum === 'inceleniyor') guncellemeler.atanan_admin = user?.id;
      }
      if (yanit) {
        // Mevcut mesajlara yanıt ekle
        const { data: talep } = await supabase.from('destek_talepleri').select('mesajlar').eq('id', id).single();
        const mevcutMesajlar = (talep?.mesajlar || []) as Array<Record<string, unknown>>;
        mevcutMesajlar.push({
          gonderen: 'admin', ad: 'Destek Ekibi', mesaj: yanit,
          tarih: new Date().toISOString(),
        });
        guncellemeler.mesajlar = mevcutMesajlar;
        if (!guncellemeler.durum) guncellemeler.durum = 'inceleniyor';
        guncellemeler.atanan_admin = user?.id;
        if (!talep?.mesajlar?.length) guncellemeler.ilk_yanit_tarihi = new Date().toISOString();
      }
      const { error } = await supabase.from('destek_talepleri').update(guncellemeler).eq('id', id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin', 'destek'] }),
  });
}

export default function DestekPage() {
  const { data: talepler, isLoading } = useAdminDestekTalepleri();
  const durumGuncelle = useDestekDurumGuncelle();
  const auditYaz = useAdminAuditYaz();
  const [filtre, setFiltre] = useState<string>('tumu');
  const [secili, setSecili] = useState<Record<string, unknown> | null>(null);
  const [yanit, setYanit] = useState('');

  const filtreli = (talepler || []).filter((t: Record<string, unknown>) =>
    filtre === 'tumu' || t.durum === filtre
  );

  const handleYanitla = () => {
    if (!secili || !yanit.trim()) return;
    durumGuncelle.mutate({ id: secili.id as string, yanit }, {
      onSuccess: () => {
        auditYaz.mutate({ islem: 'destek_yanitla', hedef_tablo: 'destek_talepleri', hedef_kayit_id: secili.id as string });
        setYanit('');
        setSecili(null);
      },
    });
  };

  const bekleyenSayi = (talepler || []).filter((t: Record<string, unknown>) => t.durum === 'bekliyor').length;

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-lg font-bold text-zinc-200">🎧 Destek Talepleri</h1>
        <p className="text-[11px] text-zinc-600">
          {bekleyenSayi > 0 ? `${bekleyenSayi} bekleyen talep var` : 'Tüm talepler yanıtlandı'}
        </p>
      </div>

      {/* Filtreler */}
      <div className="flex gap-1">
        {[
          { key: 'tumu', label: `Tümü (${(talepler || []).length})` },
          { key: 'bekliyor', label: `Bekliyor (${(talepler || []).filter((t: Record<string, unknown>) => t.durum === 'bekliyor').length})` },
          { key: 'inceleniyor', label: 'İnceleniyor' },
          { key: 'cozuldu', label: 'Çözüldü' },
          { key: 'kapatildi', label: 'Kapatıldı' },
        ].map((f) => (
          <button key={f.key} onClick={() => setFiltre(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              filtre === f.key ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Talepler */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900/50 border border-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtreli.map((talep: Record<string, unknown>) => {
            const oncelikInfo = ONCELIK_BADGE[talep.oncelik as string] || ONCELIK_BADGE.normal;
            const durumInfo = DURUM_BADGE[talep.durum as string] || DURUM_BADGE.bekliyor;
            const mesajlar = (talep.mesajlar || []) as Array<Record<string, unknown>>;

            return (
              <div key={talep.id as string}
                className={`rounded-xl border p-4 transition-all cursor-pointer hover:border-amber-500/30 ${
                  talep.durum === 'bekliyor' ? 'border-amber-500/20 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/30'
                }`}
                onClick={() => setSecili(talep)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[13px] font-bold text-zinc-200 truncate">{talep.konu as string}</h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${oncelikInfo.renk}`}>{oncelikInfo.etiket}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${durumInfo.renk}`}>{durumInfo.etiket}</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-zinc-600">
                      <span>📅 {new Date(talep.created_at as string).toLocaleDateString('tr-TR')}</span>
                      <span>💬 {mesajlar.length} mesaj</span>
                    </div>
                  </div>
                  <span className="text-zinc-600 text-[11px]">→</span>
                </div>
              </div>
            );
          })}
          {filtreli.length === 0 && (
            <div className="text-center py-8 text-[12px] text-zinc-600">Bu filtrede talep bulunamadı</div>
          )}
        </div>
      )}

      {/* Detay & Yanıt Modal */}
      {secili && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSecili(null)}>
          <div className="bg-[#0d0f14] border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-zinc-800">
              <h2 className="text-[14px] font-bold text-zinc-200 mb-1">{secili.konu as string}</h2>
              <div className="flex gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${(ONCELIK_BADGE[secili.oncelik as string] || ONCELIK_BADGE.normal).renk}`}>
                  {(ONCELIK_BADGE[secili.oncelik as string] || ONCELIK_BADGE.normal).etiket}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${(DURUM_BADGE[secili.durum as string] || DURUM_BADGE.bekliyor).renk}`}>
                  {(DURUM_BADGE[secili.durum as string] || DURUM_BADGE.bekliyor).etiket}
                </span>
              </div>
            </div>

            {/* Mesajlar */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {((secili.mesajlar || []) as Array<Record<string, unknown>>).map((m, i) => (
                <div key={i} className={`p-3 rounded-lg ${m.gonderen === 'admin' ? 'bg-amber-500/5 border border-amber-500/10 ml-4' : 'bg-zinc-800/50 mr-4'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-zinc-400">{m.ad as string || 'Kullanıcı'}</span>
                    <span className="text-[9px] text-zinc-600">{m.tarih ? new Date(m.tarih as string).toLocaleString('tr-TR') : ''}</span>
                  </div>
                  <p className="text-[12px] text-zinc-300">{m.mesaj as string}</p>
                </div>
              ))}
              {((secili.mesajlar || []) as Array<unknown>).length === 0 && (
                <div className="text-center text-[12px] text-zinc-600 py-4">Henüz mesaj yok</div>
              )}
            </div>

            {/* Yanıt formu */}
            <div className="p-5 border-t border-zinc-800 space-y-3">
              <textarea value={yanit} onChange={(e) => setYanit(e.target.value)} rows={3}
                placeholder="Yanıtınızı yazın..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[12px] text-zinc-300 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none resize-none" />
              <div className="flex gap-2">
                <button onClick={() => { durumGuncelle.mutate({ id: secili.id as string, durum: 'cozuldu' }); setSecili(null); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                  ✓ Çözüldü
                </button>
                <button onClick={() => { durumGuncelle.mutate({ id: secili.id as string, durum: 'kapatildi' }); setSecili(null); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-700 text-zinc-400 hover:bg-zinc-600 transition-all">
                  Kapat
                </button>
                <div className="flex-1" />
                <button onClick={() => setSecili(null)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all">
                  İptal
                </button>
                <button onClick={handleYanitla} disabled={!yanit.trim() || durumGuncelle.isPending}
                  className="px-4 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                  Yanıtla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
