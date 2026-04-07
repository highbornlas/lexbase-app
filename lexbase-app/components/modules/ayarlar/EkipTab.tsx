'use client';

import { useState, useMemo } from 'react';
import { usePersoneller, usePersonelKaydet, usePersonelSil, type Personel } from '@/lib/hooks/usePersonel';
import { useYetki } from '@/lib/hooks/useRol';
import { ROL_ETIKETLERI, type Rol } from '@/lib/hooks/useRol';
import { useBildirimGonder } from '@/lib/hooks/useBildirimler';
import { PersonelModal } from '@/components/modules/PersonelModal';
import { SectionTitle, Badge, AyarlarEmptyState, AyarInput } from './shared';

/* ══════════════════════════════════════════════════════════════
   Ekip Tab — Personel yönetimi, rol atama, filtreleme, silme
   ══════════════════════════════════════════════════════════════ */

const DURUM_LABEL: Record<string, { label: string; color: string }> = {
  aktif: { label: 'Aktif', color: 'green' },
  davet_gonderildi: { label: 'Davet', color: 'gold' },
  pasif: { label: 'Pasif', color: 'gray' },
};

export function EkipTab() {
  const { data: personeller, isLoading } = usePersoneller();
  const { yetkili } = useYetki('kullanici:yonet');
  const kaydet = usePersonelKaydet();
  const sil = usePersonelSil();
  const bildirimGonder = useBildirimGonder();

  const [arama, setArama] = useState('');
  const [rolFiltre, setRolFiltre] = useState<string>('');
  const [durumFiltre, setDurumFiltre] = useState<string>('');
  const [modalAcik, setModalAcik] = useState(false);
  const [seciliPersonel, setSeciliPersonel] = useState<Personel | null>(null);
  const [aksiyonOnay, setAksiyonOnay] = useState<{ id: string; tip: 'pasif' | 'sil' } | null>(null);
  const [davetYukleniyor, setDavetYukleniyor] = useState<string | null>(null);
  const [davetMesaj, setDavetMesaj] = useState<{ tip: 'bilgi' | 'hata'; metin: string } | null>(null);

  const filtrelenmis = useMemo(() => {
    if (!personeller) return [];
    return personeller.filter((p) => {
      if (arama) {
        const q = arama.toLocaleLowerCase('tr');
        const ad = (p.ad || '').toLocaleLowerCase('tr');
        const email = (p.email || '').toLocaleLowerCase('tr');
        if (!ad.includes(q) && !email.includes(q)) return false;
      }
      if (rolFiltre && p.rol !== rolFiltre) return false;
      if (durumFiltre && (p.durum || 'aktif') !== durumFiltre) return false;
      return true;
    });
  }, [personeller, arama, rolFiltre, durumFiltre]);

  // Rol dağılımı
  const rolDagilimi = useMemo(() => {
    if (!personeller) return {};
    const map: Record<string, number> = {};
    for (const p of personeller) {
      const rol = p.rol || 'avukat';
      map[rol] = (map[rol] || 0) + 1;
    }
    return map;
  }, [personeller]);

  function handleDuzenle(p: Personel) {
    setSeciliPersonel(p);
    setModalAcik(true);
  }

  function handleYeniEkle() {
    setSeciliPersonel(null);
    setModalAcik(true);
  }

  async function handlePasifYap(p: Personel) {
    const yeniDurum = p.durum === 'pasif' ? 'aktif' : 'pasif';
    await kaydet.mutateAsync({ ...p, durum: yeniDurum });
    bildirimGonder.mutate({
      tip: 'sistem',
      baslik: yeniDurum === 'pasif' ? '⏸️ Personel pasifleştirildi' : '▶️ Personel aktifleştirildi',
      mesaj: `${p.ad || '(adsız)'} ${yeniDurum === 'pasif' ? 'pasif' : 'aktif'} durumuna geçirildi.`,
      link: '/personel',
    });
    setAksiyonOnay(null);
  }

  async function handleSil(p: Personel) {
    await sil.mutateAsync(p.id);
    setAksiyonOnay(null);
  }

  // Bekleyen davetler
  const bekleyenDavetler = useMemo(() => {
    if (!personeller) return [];
    return personeller.filter((p) => p.durum === 'davet_gonderildi');
  }, [personeller]);

  // Daveti iptal et (pasif yap)
  async function handleDavetIptal(p: Personel) {
    await kaydet.mutateAsync({ ...p, durum: 'pasif' });
    bildirimGonder.mutate({
      tip: 'sistem',
      baslik: '❌ Davet iptal edildi',
      mesaj: `${p.ad || '(adsız)'} için gönderilen davet iptal edildi.`,
      link: '/personel',
    });
  }

  // Daveti tekrar gönder
  async function handleDavetTekrar(p: Personel) {
    if (!p.email) return;
    setDavetYukleniyor(p.id);
    setDavetMesaj(null);
    try {
      const { createClient: cc } = await import('@/lib/supabase/client');
      const supabase = cc();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Davet göndermek için oturum bulunamadı.');
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: p.email.trim(),
          ad: (p.ad || '').trim(),
          rol: p.rol || 'avukat',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Davet gönderilemedi.');
      }

      const yeniDurum = result.status === 'invited' ? 'davet_gonderildi' : 'aktif';
      if ((p.durum || 'aktif') !== yeniDurum) {
        await kaydet.mutateAsync({ ...p, durum: yeniDurum });
      }

      setDavetMesaj({
        tip: 'bilgi',
        metin: result.message || `${p.ad || '(adsız)'} için davet işlemi tamamlandı.`,
      });
    } catch (error) {
      setDavetMesaj({
        tip: 'hata',
        metin: error instanceof Error ? error.message : 'Davet tekrar gönderilemedi.',
      });
    }
    setDavetYukleniyor(null);
  }

  if (!yetkili) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-2">🔒</div>
        <p className="text-sm text-text-muted">Ekip yönetimi yetkiniz yok</p>
        <p className="text-[11px] text-text-dim mt-1">Bu sayfa yalnızca yöneticiler tarafından erişilebilir</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle sub={`Toplam ${personeller?.length || 0} personel`}>Ekip Yönetimi</SectionTitle>
        <button
          onClick={handleYeniEkle}
          className="px-3 py-1.5 bg-gold text-bg font-semibold rounded-lg text-xs hover:bg-gold-light transition-colors"
        >
          + Personel Ekle
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {(['yonetici', 'avukat', 'stajyer', 'sekreter'] as Rol[]).map((rol) => {
          const info = ROL_ETIKETLERI[rol];
          return (
            <div key={rol} className="bg-surface2 border border-border/50 rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-text">{rolDagilimi[rol] || 0}</div>
              <div className={`text-[10px] font-medium ${info.renk.split(' ')[0]}`}>{info.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 mb-4">
        <AyarInput
          type="text"
          value={arama}
          onChange={(e) => setArama(e.target.value)}
          placeholder="İsim veya e-posta ara..."
          className="!w-auto flex-1"
        />
        <select
          value={rolFiltre}
          onChange={(e) => setRolFiltre(e.target.value)}
          className="px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="">Tüm Roller</option>
          {(['yonetici', 'avukat', 'stajyer', 'sekreter'] as Rol[]).map((r) => (
            <option key={r} value={r}>{ROL_ETIKETLERI[r].label}</option>
          ))}
        </select>
        <select
          value={durumFiltre}
          onChange={(e) => setDurumFiltre(e.target.value)}
          className="px-2 py-1.5 bg-surface2 border border-border rounded-lg text-xs text-text focus:outline-none focus:border-gold"
        >
          <option value="">Tüm Durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="davet_gonderildi">Davet Gönderildi</option>
          <option value="pasif">Pasif</option>
        </select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-8 text-text-muted text-sm">Yükleniyor...</div>
      ) : filtrelenmis.length === 0 ? (
        <AyarlarEmptyState icon="👥" text="Personel bulunamadı" sub="Yeni personel ekleyerek başlayın" />
      ) : (
        <div className="space-y-2">
          {filtrelenmis.map((p) => {
            const durumInfo = DURUM_LABEL[p.durum || 'aktif'] || DURUM_LABEL.aktif;
            const rolInfo = ROL_ETIKETLERI[(p.rol || 'avukat') as Rol] || ROL_ETIKETLERI.avukat;
            const onayAktif = aksiyonOnay?.id === p.id;

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 bg-surface2 border border-border/50 rounded-lg px-4 py-3 hover:border-gold/20 transition-colors ${
                  p.durum === 'pasif' ? 'opacity-60' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${rolInfo.renk}`}>
                  {(p.ad || '?')[0].toLocaleUpperCase('tr')}
                </div>

                {/* Bilgiler */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text truncate">{p.ad || '(adsız)'}</span>
                    <Badge color={durumInfo.color}>{durumInfo.label}</Badge>
                  </div>
                  <div className="text-[11px] text-text-dim truncate">
                    {rolInfo.label}
                    {p.email && ` · ${p.email}`}
                    {p.baroSicil && ` · Sicil: ${p.baroSicil}`}
                  </div>
                </div>

                {/* Aksiyonlar */}
                <div className="flex items-center gap-1.5">
                  {onayAktif ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-text-dim mr-1">
                        {aksiyonOnay.tip === 'sil' ? 'Silinsin mi?' : (p.durum === 'pasif' ? 'Aktifleştirilsin mi?' : 'Pasifleştirilsin mi?')}
                      </span>
                      <button
                        onClick={() => aksiyonOnay.tip === 'sil' ? handleSil(p) : handlePasifYap(p)}
                        disabled={sil.isPending || kaydet.isPending}
                        className="px-2 py-1 text-[11px] text-red border border-red/20 rounded-lg hover:bg-red/10 transition-colors"
                      >
                        {sil.isPending || kaydet.isPending ? '...' : 'Evet'}
                      </button>
                      <button
                        onClick={() => setAksiyonOnay(null)}
                        className="px-2 py-1 text-[11px] text-text-muted border border-border rounded-lg hover:bg-surface2 transition-colors"
                      >
                        Hayır
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDuzenle(p)}
                        className="px-2 py-1 text-[11px] text-gold border border-gold/20 rounded-lg hover:bg-gold-dim transition-colors"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => setAksiyonOnay({ id: p.id, tip: 'pasif' })}
                        className="px-2 py-1 text-[11px] text-text-muted border border-border rounded-lg hover:text-gold hover:border-gold/20 transition-colors"
                      >
                        {p.durum === 'pasif' ? 'Aktifleştir' : 'Pasifleştir'}
                      </button>
                      <button
                        onClick={() => setAksiyonOnay({ id: p.id, tip: 'sil' })}
                        className="px-2 py-1 text-[11px] text-text-muted border border-border rounded-lg hover:text-red hover:border-red/20 transition-colors"
                      >
                        Sil
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bekleyen Davetler Paneli */}
      {bekleyenDavetler.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-gold">📨 Bekleyen Davetler</span>
            <span className="bg-gold text-bg text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {bekleyenDavetler.length}
            </span>
          </div>
          {davetMesaj && (
            <div className={`mb-3 rounded-lg px-3 py-2 text-[11px] border ${
              davetMesaj.tip === 'hata'
                ? 'bg-red/10 border-red/20 text-red'
                : 'bg-green/10 border-green/20 text-green'
            }`}>
              {davetMesaj.metin}
            </div>
          )}
          <div className="space-y-2">
            {bekleyenDavetler.map((p) => (
              <div
                key={`davet-${p.id}`}
                className="flex items-center gap-3 bg-gold-dim/20 border border-gold/20 rounded-lg px-4 py-2.5"
              >
                <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-xs font-bold text-gold">
                  ✉️
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text truncate">{p.ad || '(adsız)'}</div>
                  <div className="text-[11px] text-text-dim truncate">
                    {p.email || 'E-posta yok'}
                    {p.rol && ` · ${ROL_ETIKETLERI[(p.rol as Rol)]?.label || p.rol}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDavetTekrar(p)}
                    disabled={davetYukleniyor === p.id}
                    className="px-2 py-1 text-[11px] text-gold border border-gold/20 rounded-lg hover:bg-gold-dim transition-colors disabled:opacity-50"
                  >
                    {davetYukleniyor === p.id ? '...' : '🔄 Tekrar Gönder'}
                  </button>
                  <button
                    onClick={() => handleDavetIptal(p)}
                    disabled={kaydet.isPending}
                    className="px-2 py-1 text-[11px] text-red border border-red/20 rounded-lg hover:bg-red/10 transition-colors disabled:opacity-50"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personel Modal */}
      <PersonelModal
        open={modalAcik}
        onClose={() => { setModalAcik(false); setSeciliPersonel(null); }}
        personel={seciliPersonel}
      />
    </div>
  );
}
