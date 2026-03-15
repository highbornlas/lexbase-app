'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SectionTitle, FieldGroup, AyarInput, StatusMessage, SaveButton, Separator, AyarlarEmptyState } from './shared';

/* ══════════════════════════════════════════════════════════════
   Güvenlik Tab — Şifre değiştirme, oturum yönetimi, giriş geçmişi
   ══════════════════════════════════════════════════════════════ */

interface GirisKaydi {
  id: string;
  tarih: string;
  ip?: string;
  konum?: string;
  cihaz?: string;
}

function sifreGucuHesapla(sifre: string): { seviye: string; renk: string; barem: number } {
  if (sifre.length === 0) return { seviye: '', renk: '', barem: 0 };
  let puan = 0;
  if (sifre.length >= 8) puan++;
  if (sifre.length >= 12) puan++;
  if (/[A-Z]/.test(sifre)) puan++;
  if (/[a-z]/.test(sifre)) puan++;
  if (/[0-9]/.test(sifre)) puan++;
  if (/[^A-Za-z0-9]/.test(sifre)) puan++;

  if (puan >= 5) return { seviye: 'Çok Güçlü', renk: 'text-green', barem: 100 };
  if (puan >= 4) return { seviye: 'Güçlü', renk: 'text-green', barem: 80 };
  if (puan >= 3) return { seviye: 'Orta', renk: 'text-gold', barem: 60 };
  if (puan >= 2) return { seviye: 'Zayıf', renk: 'text-red', barem: 40 };
  return { seviye: 'Çok Zayıf', renk: 'text-red', barem: 20 };
}

export function GuvenlikTab() {
  // Şifre değiştirme
  const [mevcutSifre, setMevcutSifre] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('');
  const [sifreMesaj, setSifreMesaj] = useState('');
  const [sifreYukleniyor, setSifreYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);

  // Giriş geçmişi
  const [girisGecmisi, setGirisGecmisi] = useState<GirisKaydi[]>([]);
  const [gecmisYukleniyor, setGecmisYukleniyor] = useState(true);

  const guc = sifreGucuHesapla(yeniSifre);

  const girisGecmisiYukle = useCallback(async () => {
    setGecmisYukleniyor(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ip_loglari tablosundan son girişleri çek
      const { data } = await supabase
        .from('ip_loglari')
        .select('*')
        .eq('auth_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setGirisGecmisi(
          data.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            tarih: d.created_at as string,
            ip: d.ip as string | undefined,
            konum: d.konum as string | undefined,
            cihaz: d.cihaz as string | undefined,
          }))
        );
      }
    } catch {
      // ip_loglari tablosu yoksa sessizce geç
    }
    setGecmisYukleniyor(false);
  }, []);

  useEffect(() => {
    girisGecmisiYukle();
  }, [girisGecmisiYukle]);

  const sifreDegistir = async () => {
    if (yeniSifre.length < 8) {
      setSifreMesaj('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (yeniSifre !== yeniSifreTekrar) {
      setSifreMesaj('Yeni şifreler eşleşmiyor.');
      return;
    }
    if (guc.barem < 60) {
      setSifreMesaj('Lütfen daha güçlü bir şifre seçin. Büyük/küçük harf, rakam ve özel karakter kullanın.');
      return;
    }

    setSifreYukleniyor(true);
    setSifreMesaj('');
    try {
      const supabase = createClient();

      // Mevcut şifre doğrulama — önce mevcut session'ı yenileyerek
      if (mevcutSifre) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: mevcutSifre,
          });
          if (loginError) {
            setSifreMesaj('Mevcut şifre yanlış.');
            setSifreYukleniyor(false);
            return;
          }
        }
      }

      const { error } = await supabase.auth.updateUser({ password: yeniSifre });
      if (error) throw error;

      setSifreMesaj('Şifre başarıyla güncellendi.');
      setMevcutSifre('');
      setYeniSifre('');
      setYeniSifreTekrar('');
    } catch {
      setSifreMesaj('Şifre değiştirilemedi. Lütfen tekrar deneyin.');
    }
    setSifreYukleniyor(false);
  };

  const tumOturumlariBitir = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'others' });
      setSifreMesaj('Diğer oturumlarda çıkış yapıldı.');
    } catch {
      setSifreMesaj('Oturumlar kapatılamadı.');
    }
  };

  return (
    <div>
      {/* Şifre Değiştirme */}
      <SectionTitle sub="Hesap güvenliğiniz için düzenli olarak şifrenizi değiştirin">
        Şifre Değiştir
      </SectionTitle>

      <div className="space-y-4 max-w-md">
        <FieldGroup label="Mevcut Şifre">
          <div className="relative">
            <AyarInput
              type={sifreGoster ? 'text' : 'password'}
              value={mevcutSifre}
              onChange={(e) => setMevcutSifre(e.target.value)}
              placeholder="Mevcut şifreniz"
            />
          </div>
        </FieldGroup>

        <FieldGroup label="Yeni Şifre">
          <div className="relative">
            <AyarInput
              type={sifreGoster ? 'text' : 'password'}
              value={yeniSifre}
              onChange={(e) => setYeniSifre(e.target.value)}
              placeholder="En az 8 karakter"
            />
            <button
              type="button"
              onClick={() => setSifreGoster(!sifreGoster)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim hover:text-text text-xs"
            >
              {sifreGoster ? '🙈' : '👁️'}
            </button>
          </div>
          {guc.seviye && (
            <div className="mt-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      guc.barem >= 80 ? 'bg-green' : guc.barem >= 60 ? 'bg-gold' : 'bg-red'
                    }`}
                    style={{ width: `${guc.barem}%` }}
                  />
                </div>
                <span className={`text-[10px] font-medium ${guc.renk}`}>{guc.seviye}</span>
              </div>
              <div className="text-[9px] text-text-dim mt-0.5 space-x-2">
                <span className={yeniSifre.length >= 8 ? 'text-green' : ''}>✓ 8+ karakter</span>
                <span className={/[A-Z]/.test(yeniSifre) ? 'text-green' : ''}>✓ Büyük harf</span>
                <span className={/[0-9]/.test(yeniSifre) ? 'text-green' : ''}>✓ Rakam</span>
                <span className={/[^A-Za-z0-9]/.test(yeniSifre) ? 'text-green' : ''}>✓ Özel karakter</span>
              </div>
            </div>
          )}
        </FieldGroup>

        <FieldGroup label="Yeni Şifre (Tekrar)">
          <AyarInput
            type={sifreGoster ? 'text' : 'password'}
            value={yeniSifreTekrar}
            onChange={(e) => setYeniSifreTekrar(e.target.value)}
            placeholder="Yeni şifreyi tekrar girin"
          />
          {yeniSifreTekrar && yeniSifre !== yeniSifreTekrar && (
            <p className="text-[10px] text-red mt-0.5">Şifreler eşleşmiyor</p>
          )}
        </FieldGroup>

        <StatusMessage mesaj={sifreMesaj} />
        <SaveButton
          onClick={sifreDegistir}
          disabled={sifreYukleniyor}
          label="Şifreyi Değiştir"
          loadingLabel="Değiştiriliyor..."
        />
      </div>

      <Separator />

      {/* Oturum Yönetimi */}
      <SectionTitle sub="Diğer cihazlardaki oturumlarınızı yönetin">
        Oturum Yönetimi
      </SectionTitle>

      <div className="max-w-md">
        <button
          onClick={tumOturumlariBitir}
          className="px-4 py-2 bg-red/10 border border-red/30 text-red font-semibold rounded-lg text-xs hover:bg-red/20 transition-colors"
        >
          Diğer Tüm Oturumları Sonlandır
        </button>
        <p className="text-[10px] text-text-dim mt-1.5">Bu cihaz dışındaki tüm oturumlardan çıkış yapılır</p>
      </div>

      <Separator />

      {/* Giriş Geçmişi */}
      <SectionTitle sub="Son 10 giriş kaydı">
        Giriş Geçmişi
      </SectionTitle>

      {gecmisYukleniyor ? (
        <div className="text-center py-4 text-text-muted text-sm">Yükleniyor...</div>
      ) : girisGecmisi.length === 0 ? (
        <AyarlarEmptyState icon="📋" text="Giriş geçmişi bulunamadı" sub="IP loglama aktif değilse geçmiş kaydedilmez" />
      ) : (
        <div className="space-y-1.5 max-w-lg">
          {girisGecmisi.map((g) => (
            <div key={g.id} className="flex items-center gap-3 bg-surface2 border border-border/50 rounded-lg px-3 py-2">
              <span className="text-sm">🔐</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text">
                  {new Date(g.tarih).toLocaleString('tr-TR')}
                </div>
                <div className="text-[10px] text-text-dim truncate">
                  {g.ip && `IP: ${g.ip}`}
                  {g.konum && ` · ${g.konum}`}
                  {g.cihaz && ` · ${g.cihaz}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
