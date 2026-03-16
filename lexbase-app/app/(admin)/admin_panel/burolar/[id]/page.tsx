'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAdminAuditYaz } from '@/lib/hooks/useAdmin';

/* ══════════════════════════════════════════════════════════════
   Admin — Büro Detay Sayfası
   Sekmeler: Özet, Üyeler, Abonelik, İstatistik, Aksiyonlar
   ══════════════════════════════════════════════════════════════ */

type Sekme = 'ozet' | 'uyeler' | 'abonelik' | 'istatistik' | 'aksiyonlar';

function useBuroDetay(buroId: string) {
  return useQuery({
    queryKey: ['admin', 'buro', buroId],
    queryFn: async () => {
      const supabase = createClient();
      const [buroRes, uyelerRes, abonelikRes, davaRes, muvRes, icraRes] = await Promise.all([
        supabase.from('burolar').select('*').eq('id', buroId).single(),
        supabase.from('uyelikler').select('*, kullanici:auth_id(email, raw_user_meta_data)').eq('buro_id', buroId),
        supabase.from('abonelikler').select('*, plan:plan_id(*)').eq('buro_id', buroId).order('created_at', { ascending: false }).limit(1),
        supabase.from('dava').select('id', { count: 'exact', head: true }).eq('buro_id', buroId),
        supabase.from('muvekkil').select('id', { count: 'exact', head: true }).eq('buro_id', buroId),
        supabase.from('icra').select('id', { count: 'exact', head: true }).eq('buro_id', buroId),
      ]);
      return {
        buro: buroRes.data,
        uyeler: uyelerRes.data || [],
        abonelik: abonelikRes.data?.[0] || null,
        istatistik: {
          dava: davaRes.count || 0,
          muvekkil: muvRes.count || 0,
          icra: icraRes.count || 0,
        },
      };
    },
    enabled: !!buroId,
  });
}

function useAbonelikGuncelle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ buroId, durum }: { buroId: string; durum: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('abonelikler')
        .update({ durum, updated_at: new Date().toISOString() })
        .eq('buro_id', buroId);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

const DURUM_RENK: Record<string, string> = {
  aktif: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  read_only: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  askida: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  iptal: 'bg-red-500/10 text-red-400 border-red-500/20',
  suresi_doldu: 'bg-zinc-700/50 text-zinc-400 border-zinc-600',
};

const DURUM_ETIKET: Record<string, string> = {
  aktif: 'Aktif',
  read_only: 'Salt Okunur',
  askida: 'Askıda',
  iptal: 'İptal',
  suresi_doldu: 'Süresi Doldu',
};

export default function BuroDetayPage() {
  const params = useParams();
  const buroId = params.id as string;
  const { data, isLoading } = useBuroDetay(buroId);
  const abonelikGuncelle = useAbonelikGuncelle();
  const auditYaz = useAdminAuditYaz();
  const [sekme, setSekme] = useState<Sekme>('ozet');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.buro) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3">🔍</div>
        <div className="text-zinc-400 text-sm">Büro bulunamadı</div>
        <Link href="/admin_panel/burolar" className="text-amber-500 text-xs mt-2 inline-block hover:underline">← Geri Dön</Link>
      </div>
    );
  }

  const buro = data.buro as Record<string, unknown>;
  const abonelikDurum = data.abonelik?.durum || 'trial';

  const handleDurumDegistir = (yeniDurum: string) => {
    if (!confirm(`Büro durumu "${DURUM_ETIKET[yeniDurum]}" olarak değiştirilsin mi?`)) return;
    abonelikGuncelle.mutate({ buroId, durum: yeniDurum });
    auditYaz.mutate({
      islem: 'buro_durum_degistir',
      hedef_tablo: 'abonelikler',
      hedef_kayit_id: buroId,
      detay: { onceki: abonelikDurum, yeni: yeniDurum },
    });
  };

  const sekmeler: { key: Sekme; label: string; icon: string }[] = [
    { key: 'ozet', label: 'Özet', icon: '📋' },
    { key: 'uyeler', label: `Üyeler (${data.uyeler.length})`, icon: '👥' },
    { key: 'abonelik', label: 'Abonelik', icon: '💳' },
    { key: 'istatistik', label: 'İstatistik', icon: '📊' },
    { key: 'aksiyonlar', label: 'Aksiyonlar', icon: '⚡' },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-600">
        <Link href="/admin_panel/burolar" className="hover:text-amber-500 transition-colors">Bürolar</Link>
        <span>›</span>
        <span className="text-zinc-400">{(buro.ad as string) || 'Büro Detay'}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
            🏢
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-200">{(buro.ad as string) || 'İsimsiz Büro'}</h1>
            <div className="text-[11px] text-zinc-500">{(buro.adres as string)?.split(',')[0] || '—'} · {(buro.mail as string) || '—'}</div>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold ${DURUM_RENK[abonelikDurum] || DURUM_RENK.aktif}`}>
          {DURUM_ETIKET[abonelikDurum] || abonelikDurum}
        </span>
      </div>

      {/* Mini KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Üye', value: data.uyeler.length, icon: '👤' },
          { label: 'Dava', value: data.istatistik.dava, icon: '📁' },
          { label: 'Müvekkil', value: data.istatistik.muvekkil, icon: '📒' },
          { label: 'İcra', value: data.istatistik.icra, icon: '⚡' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2">
            <div className="text-[10px] text-zinc-600">{k.icon} {k.label}</div>
            <div className="text-lg font-bold text-zinc-300 font-[var(--font-playfair)]">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Sekmeler */}
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
        {sekmeler.map((s) => (
          <button
            key={s.key}
            onClick={() => setSekme(s.key)}
            className={`px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              sekme === s.key
                ? 'border-amber-500 text-amber-500'
                : 'border-transparent text-zinc-600 hover:text-zinc-400'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Sekme İçerikleri */}
      {sekme === 'ozet' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Büro Adı', value: (buro.ad as string) },
              { label: 'Email', value: (buro.mail as string) },
              { label: 'Telefon', value: (buro.tel as string) },
              { label: 'Adres', value: (buro.adres as string) },
              { label: 'Vergi No', value: (buro.vergi_no as string) },
              { label: 'Vergi Dairesi', value: (buro.vergi_dairesi as string) },
              { label: 'Baro', value: (buro.baro as string) },
              { label: 'Kayıt Tarihi', value: data.buro.created_at ? new Date(data.buro.created_at).toLocaleDateString('tr-TR') : '—' },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">{item.label}</div>
                <div className="text-[13px] text-zinc-300">{item.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sekme === 'uyeler' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Kullanıcı</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Rol</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody>
              {data.uyeler.map((uye: Record<string, unknown>) => (
                <tr key={uye.id as string} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="px-4 py-3">
                    <div className="text-[12px] text-zinc-300">{(uye as Record<string, unknown>).auth_id as string}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-amber-500 font-medium">{uye.rol as string || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      uye.durum === 'aktif' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {uye.durum as string || '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.uyeler.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-[12px] text-zinc-600">Üye bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {sekme === 'abonelik' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-4">
          {data.abonelik ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Plan', value: (data.abonelik.plan as Record<string, unknown>)?.ad || data.abonelik.plan_id },
                { label: 'Durum', value: DURUM_ETIKET[data.abonelik.durum] || data.abonelik.durum },
                { label: 'Başlangıç', value: new Date(data.abonelik.baslangic).toLocaleDateString('tr-TR') },
                { label: 'Bitiş', value: data.abonelik.bitis ? new Date(data.abonelik.bitis).toLocaleDateString('tr-TR') : 'Belirsiz' },
                { label: 'Tutar', value: data.abonelik.tutar ? `${data.abonelik.tutar} ${data.abonelik.para_birimi}` : 'Ücretsiz' },
                { label: 'Otomatik Yenileme', value: data.abonelik.otomatik_yenileme ? 'Evet' : 'Hayır' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">{item.label}</div>
                  <div className="text-[13px] text-zinc-300">{item.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-[12px] text-zinc-600">Abonelik kaydı yok — varsayılan Trial</div>
          )}
        </div>
      )}

      {sekme === 'istatistik' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Toplam Dava', value: data.istatistik.dava, icon: '📁' },
              { label: 'Toplam Müvekkil', value: data.istatistik.muvekkil, icon: '📒' },
              { label: 'Toplam İcra', value: data.istatistik.icra, icon: '⚡' },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <div className="text-2xl mb-1">{item.icon}</div>
                <div className="text-2xl font-bold text-zinc-200 font-[var(--font-playfair)]">{item.value}</div>
                <div className="text-[10px] text-zinc-600 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sekme === 'aksiyonlar' && (
        <div className="space-y-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-[12px] font-bold text-zinc-400 mb-3">Durum Değiştir</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(DURUM_ETIKET).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleDurumDegistir(key)}
                  disabled={abonelikDurum === key || abonelikGuncelle.isPending}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                    abonelikDurum === key
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-500 cursor-default'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  } disabled:opacity-40`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-red-900/30 bg-red-900/5 p-5">
            <h3 className="text-[12px] font-bold text-red-400 mb-2">⚠️ Tehlikeli Bölge</h3>
            <p className="text-[11px] text-zinc-500 mb-3">Bu işlemler geri alınamaz.</p>
            <button
              disabled
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-red-800 text-red-400 opacity-50 cursor-not-allowed"
            >
              Büroyu Sil (Yakında)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
