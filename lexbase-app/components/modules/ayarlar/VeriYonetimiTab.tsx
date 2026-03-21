'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useBuroId, useKullanici } from '@/lib/hooks/useBuro';
import { useYetki } from '@/lib/hooks/useRol';
import { SectionTitle, Separator, DangerButton, AyarlarEmptyState, StatusMessage } from './shared';

/* ══════════════════════════════════════════════════════════════
   Veri Yönetimi Tab — Veri dışa aktarma, KVKK uyumluluk, denetim
   ══════════════════════════════════════════════════════════════ */

interface DenetimKaydi {
  id: string;
  tarih: string;
  islem: string;
  kullanici: string;
  detay: string;
}

export function VeriYonetimiTab() {
  const buroId = useBuroId();
  const kullanici = useKullanici();
  const { yetkili: yonetici } = useYetki('ayarlar:duzenle');
  const { yetkili: auditOku } = useYetki('audit:oku');

  const [mesaj, setMesaj] = useState('');
  const [aktarimYukleniyor, setAktarimYukleniyor] = useState(false);
  const [denetimKayitlari, setDenetimKayitlari] = useState<DenetimKaydi[]>([]);
  const [denetimYukleniyor, setDenetimYukleniyor] = useState(false);
  const [denetimYuklendi, setDenetimYuklendi] = useState(false);
  const [silmeOnay, setSilmeOnay] = useState(false);

  // ── Veri Dışa Aktarma ──────────────────────────────────────
  const veriAktar = useCallback(async (format: 'json' | 'csv') => {
    if (!buroId) { setMesaj('Büro bilgisi bulunamadı.'); return; }
    setAktarimYukleniyor(true);
    setMesaj('');

    try {
      const supabase = createClient();
      const tablolar = ['muvekkillar', 'karsi_taraflar', 'vekillar', 'davalar', 'icra', 'ihtarnameler', 'danismanliklar', 'arabuluculuklar', 'gorevler', 'etkinlikler', 'buro_giderleri', 'tahsilatlar'];

      const veri: Record<string, unknown[]> = {};

      for (const tablo of tablolar) {
        try {
          const { data } = await supabase
            .from(tablo)
            .select('id, data')
            .eq('buro_id', buroId);
          if (data) {
            veri[tablo] = data.map((r) => ({ id: r.id, ...(r.data as object) }));
          }
        } catch {
          // tablo yoksa atla
        }
      }

      let content: string;
      let mimeType: string;
      let filename: string;

      if (format === 'json') {
        content = JSON.stringify(veri, null, 2);
        mimeType = 'application/json';
        filename = `lexbase-veri-${new Date().toISOString().split('T')[0]}.json`;
      } else {
        // CSV — her tablo ayrı bölüm
        const BOM = '\uFEFF';
        const satirlar: string[] = [];
        for (const [tablo, kayitlar] of Object.entries(veri)) {
          if (!kayitlar.length) continue;
          satirlar.push(`\n# ${tablo.toLocaleUpperCase('tr')}`);
          const basliklar = Object.keys(kayitlar[0] as Record<string, unknown>);
          satirlar.push(basliklar.join(';'));
          for (const kayit of kayitlar as Record<string, unknown>[]) {
            satirlar.push(basliklar.map((b) => {
              const val = kayit[b];
              if (val === null || val === undefined) return '';
              const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
              return str.includes(';') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(';'));
          }
        }
        content = BOM + satirlar.join('\n');
        mimeType = 'text/csv';
        filename = `lexbase-veri-${new Date().toISOString().split('T')[0]}.csv`;
      }

      // İndir
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMesaj(`Veriler ${format.toUpperCase()} olarak başarıyla aktarıldı.`);
    } catch {
      setMesaj('Veri aktarımı sırasında hata oluştu.');
    }
    setAktarimYukleniyor(false);
  }, [buroId]);

  // ── Denetim Logları ────────────────────────────────────────
  const denetimLogYukle = useCallback(async () => {
    if (!buroId) return;
    setDenetimYukleniyor(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('denetim_log')
        .select('*')
        .eq('buro_id', buroId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setDenetimKayitlari(
          data.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            tarih: d.created_at as string,
            islem: d.islem as string,
            kullanici: d.kullanici_ad as string || '—',
            detay: d.detay as string || '',
          }))
        );
      }
      setDenetimYuklendi(true);
    } catch {
      // tablo yoksa boş göster
      setDenetimYuklendi(true);
    }
    setDenetimYukleniyor(false);
  }, [buroId]);

  // ── Hesap Silme ────────────────────────────────────────────
  const hesapSil = async () => {
    setMesaj('Hesap silme işlemi şu an devre dışıdır. Lütfen destek ile iletişime geçin.');
    setSilmeOnay(false);
  };

  return (
    <div>
      {/* Veri Dışa Aktarma */}
      <SectionTitle sub="Tüm büro verilerinizi JSON veya CSV formatında indirin">
        Veri Dışa Aktarma
      </SectionTitle>

      <div className="max-w-lg">
        <p className="text-[11px] text-text-dim mb-3">
          KVKK md.11 kapsamında kişisel verilerinizi talep edebilirsiniz. Tüm büro verileri dışa aktarılır.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => veriAktar('json')}
            disabled={aktarimYukleniyor}
            className="flex items-center gap-2 px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text hover:border-gold/30 transition-colors disabled:opacity-50"
          >
            <span>📄</span>
            {aktarimYukleniyor ? 'İndiriliyor...' : 'JSON olarak indir'}
          </button>
          <button
            onClick={() => veriAktar('csv')}
            disabled={aktarimYukleniyor}
            className="flex items-center gap-2 px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text hover:border-gold/30 transition-colors disabled:opacity-50"
          >
            <span>📊</span>
            {aktarimYukleniyor ? 'İndiriliyor...' : 'CSV olarak indir'}
          </button>
        </div>
      </div>

      <Separator />

      {/* KVKK Bilgilendirme */}
      <SectionTitle sub="6698 sayılı KVKK kapsamında haklarınız">
        KVKK Uyumluluk
      </SectionTitle>

      <div className="max-w-lg bg-surface2 border border-border/50 rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-sm mt-0.5">📋</span>
          <div>
            <p className="text-xs text-text font-medium">Veri Sorumlusu</p>
            <p className="text-[11px] text-text-dim">Büro yöneticisi veri sorumlusudur. Kişisel veriler yalnızca büro hesabı kapsamında işlenir.</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-sm mt-0.5">🔒</span>
          <div>
            <p className="text-xs text-text font-medium">Veri Güvenliği</p>
            <p className="text-[11px] text-text-dim">Veriler Supabase altyapısında şifrelenmiş olarak saklanır. Row Level Security (RLS) ile büro izolasyonu sağlanır.</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-sm mt-0.5">🗑️</span>
          <div>
            <p className="text-xs text-text font-medium">Unutulma Hakkı</p>
            <p className="text-[11px] text-text-dim">KVKK md.11/e gereği kişisel verilerinizin silinmesini talep edebilirsiniz.</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-sm mt-0.5">📤</span>
          <div>
            <p className="text-xs text-text font-medium">Taşınabilirlik Hakkı</p>
            <p className="text-[11px] text-text-dim">Yukarıdaki dışa aktarma araçlarını kullanarak verilerinizi alabilirsiniz.</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Denetim Logu */}
      {auditOku && (
        <>
          <SectionTitle sub="Bürodaki önemli işlemlerin kaydı">
            Denetim Logu
          </SectionTitle>

          {!denetimYuklendi ? (
            <button
              onClick={denetimLogYukle}
              disabled={denetimYukleniyor}
              className="px-4 py-2 bg-surface2 border border-border rounded-lg text-xs text-text hover:border-gold/30 transition-colors disabled:opacity-50"
            >
              {denetimYukleniyor ? 'Yükleniyor...' : 'Denetim Loglarını Yükle'}
            </button>
          ) : denetimKayitlari.length === 0 ? (
            <AyarlarEmptyState icon="📋" text="Denetim kaydı bulunamadı" sub="Önemli işlemler burada loglanır" />
          ) : (
            <div className="space-y-1.5 max-w-lg">
              {denetimKayitlari.map((d) => (
                <div key={d.id} className="flex items-center gap-3 bg-surface2 border border-border/50 rounded-lg px-3 py-2">
                  <span className="text-sm">📝</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-text font-medium">{d.islem}</div>
                    <div className="text-[10px] text-text-dim truncate">
                      {d.kullanici} · {new Date(d.tarih).toLocaleString('tr-TR')}
                      {d.detay && ` · ${d.detay}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />
        </>
      )}

      {/* Tehlikeli Bölge */}
      {yonetici && (
        <>
          <SectionTitle sub="Bu işlemler geri alınamaz">
            Tehlikeli Bölge
          </SectionTitle>

          <div className="max-w-lg bg-red/5 border border-red/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-text font-medium">Hesabı Sil</p>
                <p className="text-[10px] text-text-dim mt-0.5">Tüm büro verileri kalıcı olarak silinir. Bu işlem geri alınamaz.</p>
              </div>
              {silmeOnay ? (
                <div className="flex gap-2">
                  <DangerButton onClick={hesapSil} disabled={false}>Eminim, Sil</DangerButton>
                  <button
                    onClick={() => setSilmeOnay(false)}
                    className="px-3 py-1.5 text-xs text-text-muted border border-border rounded-lg hover:bg-surface2 transition-colors"
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <DangerButton onClick={() => setSilmeOnay(true)}>Hesabı Sil</DangerButton>
              )}
            </div>
          </div>
        </>
      )}

      <StatusMessage mesaj={mesaj} />
    </div>
  );
}
