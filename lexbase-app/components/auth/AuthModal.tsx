'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { InfoModal } from '@/components/ui/InfoModal';

/* ══════════════════════════════════════════════════════════════
   AuthModal — Giriş/Kayıt Modal
   - Google ile giriş + kayıt (OAuth → /auth/callback)
   - Bağlantı ile şifresiz giriş (Magic Link)
   - Şifremi unuttum (Password Reset)
   - KVKK + Kullanım Koşulları + Ticari İleti tıklanabilir linkler
   - Şifre görünürlük butonu + güç göstergesi
   - Telefon formatlama
   - E-posta doğrulama ekranı
   ══════════════════════════════════════════════════════════════ */

type AuthTab = 'giris' | 'kayit';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: AuthTab;
}

export function AuthModal({ open, onClose, defaultTab = 'giris' }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, defaultTab]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in-up"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-[95%] max-w-[440px] bg-[#0D1117] border border-[rgba(201,168,76,0.18)] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.85),0_0_60px_rgba(201,168,76,0.06)] animate-scale-in max-h-[95vh] overflow-y-auto">
        {/* ── Kapat ── */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-text-dim hover:text-text hover:bg-white/10 transition-all"
        >
          ✕
        </button>

        {/* ── Logo ── */}
        <div className="text-center pt-8 pb-3">
          <h1 className="font-[var(--font-playfair)] text-2xl text-gold font-bold tracking-tight">LexBase</h1>
          <p className="text-[12px] text-text-dim mt-1">Hukuk Bürosu Yönetim Platformu</p>
        </div>

        {/* ── Sekmeler — Gold arkaplan aktif ── */}
        <div className="flex mx-6 gap-1 mb-1">
          {(['giris', 'kayit'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                ${tab === t
                  ? 'bg-gradient-to-r from-[#C9A84C] to-[#E0C068] text-[#0D1117] shadow-[0_2px_12px_rgba(201,168,76,0.3)]'
                  : 'text-text-dim hover:text-text-muted hover:bg-white/5'
                }`}
            >
              {t === 'giris' ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          ))}
        </div>

        {/* ── Form İçeriği ── */}
        <div className="px-6 pt-4 pb-6">
          {tab === 'giris' ? (
            <GirisForm onClose={onClose} onSwitchTab={() => setTab('kayit')} />
          ) : (
            <KayitForm onClose={onClose} onSwitchTab={() => setTab('giris')} />
          )}
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   YARDIMCI BİLEŞENLER
   ══════════════════════════════════════════════════════════════ */

/* ── Şifre Göz İkonu ───────────────────────────────────────── */
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── Şifre Input (göz ikonu ile) ────────────────────────────── */
function PasswordInput({
  value, onChange, placeholder, required, minLength, className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  className: string;
}) {
  const [goster, setGoster] = useState(false);
  return (
    <div className="relative">
      <input
        type={goster ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className + ' pr-11'}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setGoster(!goster)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition-colors"
        tabIndex={-1}
      >
        <EyeIcon open={goster} />
      </button>
    </div>
  );
}

/* ── Şifre Güç Göstergesi ───────────────────────────────────── */
function SifreGucGostergesi({ sifre }: { sifre: string }) {
  const { skor, etiket, renk } = useMemo(() => {
    if (!sifre) return { skor: 0, etiket: '', renk: '' };
    let s = 0;
    if (sifre.length >= 8) s++;
    if (sifre.length >= 12) s++;
    if (/[a-z]/.test(sifre) && /[A-Z]/.test(sifre)) s++;
    if (/\d/.test(sifre)) s++;
    if (/[^a-zA-Z0-9]/.test(sifre)) s++;

    if (s <= 1) return { skor: 1, etiket: 'Zayıf', renk: 'bg-red' };
    if (s <= 2) return { skor: 2, etiket: 'Zayıf', renk: 'bg-orange-500' };
    if (s <= 3) return { skor: 3, etiket: 'Orta', renk: 'bg-yellow-500' };
    if (s <= 4) return { skor: 4, etiket: 'Güçlü', renk: 'bg-green' };
    return { skor: 5, etiket: 'Çok Güçlü', renk: 'bg-emerald-400' };
  }, [sifre]);

  if (!sifre) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= skor ? renk : 'bg-[#2A3142]'
            }`}
          />
        ))}
      </div>
      <span className={`text-[10px] font-medium ${
        skor <= 2 ? 'text-red' : skor <= 3 ? 'text-yellow-500' : 'text-green'
      }`}>
        {etiket}
      </span>
    </div>
  );
}

/* ── Telefon Numarası Formatlama ─────────────────────────────── */
function formatTelefon(deger: string): string {
  // Sadece rakamları al
  const rakamlar = deger.replace(/\D/g, '');
  // Maksimum 11 rakam (05XX XXX XX XX)
  const sinirli = rakamlar.slice(0, 11);

  if (sinirli.length <= 4) return sinirli;
  if (sinirli.length <= 7) return sinirli.slice(0, 4) + ' ' + sinirli.slice(4);
  if (sinirli.length <= 9) return sinirli.slice(0, 4) + ' ' + sinirli.slice(4, 7) + ' ' + sinirli.slice(7);
  return sinirli.slice(0, 4) + ' ' + sinirli.slice(4, 7) + ' ' + sinirli.slice(7, 9) + ' ' + sinirli.slice(9);
}


/* ── E-posta Sorma Mini Modal ────────────────────────────────── */
function EmailModal({
  open, onClose, baslik, aciklama, butonText, yukleniyor, hata, bilgi, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  baslik: string;
  aciklama: string;
  butonText: string;
  yukleniyor: boolean;
  hata: string;
  bilgi: string;
  onSubmit: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setEmail(''); }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-[90%] max-w-[380px] bg-[#131A2B] border border-white/10 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.85)] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-text">{baslik}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-dim hover:text-text hover:bg-white/5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* İçerik */}
        <div className="px-5 py-4 space-y-4">
          <p className="text-[12px] text-text-muted leading-relaxed">{aciklama}</p>

          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">E-Posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#161B22] border border-[#2A3142] rounded-xl text-sm text-text placeholder:text-text-dim focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,168,76,0.15)] outline-none transition-all"
              placeholder="örnek@mail.com"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && email) onSubmit(email); }}
            />
          </div>

          {hata && (
            <div className="bg-red-dim border border-red/20 rounded-xl px-3 py-2.5 text-[11px] text-red">
              {hata}
            </div>
          )}

          {bilgi && (
            <div className="bg-green-dim border border-green/20 rounded-xl px-3 py-2.5 text-[11px] text-green">
              {bilgi}
            </div>
          )}

          <button
            onClick={() => { if (email) onSubmit(email); }}
            disabled={yukleniyor || !email}
            className="w-full py-3 bg-gradient-to-r from-[#C9A84C] to-[#E0C068] text-[#0D1117] font-bold rounded-xl text-sm shadow-[0_4px_16px_rgba(201,168,76,0.3)] hover:shadow-[0_8px_24px_rgba(201,168,76,0.45)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {yukleniyor ? 'Gönderiliyor...' : butonText}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   GİRİŞ FORMU
   ══════════════════════════════════════════════════════════════ */
function GirisForm({ onClose, onSwitchTab }: { onClose: () => void; onSwitchTab: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  // Mini modal state'leri
  const [emailModalTur, setEmailModalTur] = useState<'sifremi-unuttum' | 'magic-link' | null>(null);
  const [emailModalHata, setEmailModalHata] = useState('');
  const [emailModalBilgi, setEmailModalBilgi] = useState('');
  const [emailModalYukleniyor, setEmailModalYukleniyor] = useState(false);

  const inputCls = "w-full px-4 py-3 bg-[#161B22] border border-[#2A3142] rounded-xl text-sm text-text placeholder:text-text-dim focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,168,76,0.15)] outline-none transition-all";

  function emailModalAc(tur: 'sifremi-unuttum' | 'magic-link') {
    setEmailModalTur(tur);
    setEmailModalHata('');
    setEmailModalBilgi('');
    setEmailModalYukleniyor(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHata('');
    setYukleniyor(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });

    if (error) {
      setHata(error.message.includes('Invalid login credentials')
        ? 'E-posta veya şifre hatalı.'
        : 'Giriş başarısız: ' + error.message);
      setYukleniyor(false);
      return;
    }

    // IP loglama (fire and forget)
    fetch('/api/log-giris', { method: 'POST' }).catch(() => {});

    onClose();
    router.push('/dashboard');
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: { prompt: 'select_account' },
      },
    });
  }

  async function handleEmailModalSubmit(modalEmail: string) {
    setEmailModalHata('');
    setEmailModalBilgi('');
    setEmailModalYukleniyor(true);
    const supabase = createClient();

    if (emailModalTur === 'magic-link') {
      const { error } = await supabase.auth.signInWithOtp({
        email: modalEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      });
      setEmailModalYukleniyor(false);
      if (error) {
        setEmailModalHata('Bağlantı gönderilemedi: ' + error.message);
      } else {
        setEmailModalBilgi('Giriş bağlantısı e-posta adresinize gönderildi! Lütfen e-postanızı kontrol edin.');
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(modalEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/sifre-sifirla`,
      });
      setEmailModalYukleniyor(false);
      if (error) {
        setEmailModalHata('Şifre sıfırlama bağlantısı gönderilemedi: ' + error.message);
      } else {
        setEmailModalBilgi('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi! Lütfen e-postanızı kontrol edin.');
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Google ile Giriş */}
      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 py-3 bg-[#161B22] border border-[#2A3142] rounded-xl text-sm font-medium text-text hover:border-[rgba(201,168,76,0.4)] hover:bg-[#1C2333] transition-all duration-200"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Google ile giriş yap
      </button>

      {/* VEYA Separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#2A3142]" />
        <span className="text-[11px] text-text-dim uppercase tracking-wider font-medium">veya</span>
        <div className="flex-1 h-px bg-[#2A3142]" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">E-Posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="örnek@mail.com"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Şifre</label>
          <PasswordInput
            value={sifre}
            onChange={setSifre}
            placeholder="••••••••"
            required
            className={inputCls}
          />
        </div>

        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-xl px-3 py-2.5 text-[11px] text-red">
            {hata}
          </div>
        )}

        <button type="submit" disabled={yukleniyor}
          className="w-full py-3 bg-gradient-to-r from-[#C9A84C] to-[#E0C068] text-[#0D1117] font-bold rounded-xl text-sm shadow-[0_4px_16px_rgba(201,168,76,0.3)] hover:shadow-[0_8px_24px_rgba(201,168,76,0.45)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>

      {/* Alt linkler — her biri ayrı modal açar */}
      <div className="space-y-2 text-center">
        <button
          type="button"
          onClick={() => emailModalAc('sifremi-unuttum')}
          className="text-[12px] text-gold hover:text-gold-light transition-colors block mx-auto"
        >
          Şifremi unuttum
        </button>
        <button
          type="button"
          onClick={() => emailModalAc('magic-link')}
          className="text-[12px] text-gold hover:text-gold-light transition-colors flex items-center gap-1.5 mx-auto"
        >
          <span>🔗</span> Bağlantı ile giriş (şifresiz)
        </button>
      </div>

      {/* Şifremi Unuttum Modal */}
      <EmailModal
        open={emailModalTur === 'sifremi-unuttum'}
        onClose={() => setEmailModalTur(null)}
        baslik="Şifremi Unuttum"
        aciklama="Şifre sıfırlama bağlantısı göndermek için kayıtlı e-posta adresinizi girin."
        butonText="Sıfırlama Bağlantısı Gönder"
        yukleniyor={emailModalYukleniyor}
        hata={emailModalHata}
        bilgi={emailModalBilgi}
        onSubmit={handleEmailModalSubmit}
      />

      {/* Magic Link Modal */}
      <EmailModal
        open={emailModalTur === 'magic-link'}
        onClose={() => setEmailModalTur(null)}
        baslik="Bağlantı ile Giriş"
        aciklama="Şifre girmeden giriş yapmanız için tek kullanımlık bir bağlantı gönderilecek."
        butonText="Giriş Bağlantısı Gönder"
        yukleniyor={emailModalYukleniyor}
        hata={emailModalHata}
        bilgi={emailModalBilgi}
        onSubmit={handleEmailModalSubmit}
      />
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   KAYIT FORMU
   ══════════════════════════════════════════════════════════════ */
function KayitForm({ onClose, onSwitchTab }: { onClose: () => void; onSwitchTab: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    ad: '', soyad: '', telefon: '', email: '', sifre: '', sifreTekrar: '',
    kvkk: false, ticariIleti: false,
  });
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yasalModal, setYasalModal] = useState<'kvkk' | 'kullanim' | 'ticari' | null>(null);
  const [kayitBasarili, setKayitBasarili] = useState(false);
  const [kayitEmail, setKayitEmail] = useState('');

  const guncelle = (alan: string, deger: string | boolean) => {
    setForm((prev) => ({ ...prev, [alan]: deger }));
  };

  const inputCls = "w-full px-4 py-3 bg-[#161B22] border border-[#2A3142] rounded-xl text-sm text-text placeholder:text-text-dim focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,168,76,0.15)] outline-none transition-all";

  async function handleGoogleSignup() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: { prompt: 'select_account' },
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHata('');

    if (form.sifre.length < 8) { setHata('Şifre en az 8 karakter olmalı.'); return; }
    if (form.sifre !== form.sifreTekrar) { setHata('Şifreler eşleşmiyor.'); return; }
    if (!form.kvkk) { setHata('KVKK Aydınlatma Metni ve Kullanım Koşullarını kabul etmeniz gerekiyor.'); return; }

    // Telefon doğrulama: en az 10 rakam
    const telefonRakam = form.telefon.replace(/\D/g, '');
    if (telefonRakam.length < 10) { setHata('Geçerli bir telefon numarası girin.'); return; }

    setYukleniyor(true);

    const simdi = new Date().toISOString();
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.sifre,
      options: {
        data: {
          ad: form.ad,
          soyad: form.soyad,
          ad_soyad: `${form.ad} ${form.soyad}`.trim(),
          telefon: telefonRakam,
          kvkk_onay_tarihi: simdi,
          kullanim_kosullari_onay_tarihi: simdi,
          ticari_ileti_izni: form.ticariIleti,
          ticari_ileti_onay_tarihi: form.ticariIleti ? simdi : null,
        },
      },
    });

    if (error) {
      setHata(error.message.includes('already registered')
        ? 'Bu e-posta adresi zaten kayıtlı.'
        : 'Kayıt başarısız: ' + error.message);
      setYukleniyor(false);
      return;
    }

    // E-posta doğrulama gerekiyorsa (identities boş ise kullanıcı zaten var)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setHata('Bu e-posta adresi zaten kayıtlı.');
      setYukleniyor(false);
      return;
    }

    // Supabase e-posta doğrulama açık ise kullanıcı hemen confirmed olmaz
    if (data.user && !data.session) {
      // E-posta doğrulama gerekiyor
      setKayitEmail(form.email);
      setKayitBasarili(true);
      setYukleniyor(false);
      return;
    }

    // Session varsa direkt giriş yapılmış demek (e-posta doğrulama kapalı)
    if (data.user && data.session) {
      onClose();
      router.push('/dashboard');
    }
  }

  // E-posta doğrulama ekranı
  if (kayitBasarili) {
    return (
      <div className="text-center py-4 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gold-dim flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>

        <div>
          <h3 className="text-base font-semibold text-text mb-1">E-postanızı Kontrol Edin</h3>
          <p className="text-[12px] text-text-muted leading-relaxed">
            <strong className="text-text">{kayitEmail}</strong> adresine bir doğrulama bağlantısı gönderdik.
            Hesabınızı aktifleştirmek için e-postanızdaki bağlantıya tıklayın.
          </p>
        </div>

        <div className="bg-[#161B22] border border-[#2A3142] rounded-xl p-3 text-[11px] text-text-dim leading-relaxed">
          <p className="mb-1">💡 E-postayı bulamıyor musunuz?</p>
          <ul className="space-y-0.5 ml-4">
            <li>• Spam/gereksiz klasörünü kontrol edin</li>
            <li>• E-posta adresinin doğru olduğundan emin olun</li>
            <li>• Birkaç dakika bekleyip tekrar kontrol edin</li>
          </ul>
        </div>

        <button
          onClick={() => { setKayitBasarili(false); setKayitEmail(''); }}
          className="text-[12px] text-gold hover:text-gold-light transition-colors"
        >
          ← Kayıt formuna geri dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google ile Kayıt */}
      <button
        onClick={handleGoogleSignup}
        className="w-full flex items-center justify-center gap-3 py-3 bg-[#161B22] border border-[#2A3142] rounded-xl text-sm font-medium text-text hover:border-[rgba(201,168,76,0.4)] hover:bg-[#1C2333] transition-all duration-200"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Google ile kayıt ol
      </button>

      {/* VEYA Separator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#2A3142]" />
        <span className="text-[11px] text-text-dim uppercase tracking-wider font-medium">veya</span>
        <div className="flex-1 h-px bg-[#2A3142]" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Ad</label>
            <input type="text" value={form.ad} onChange={(e) => guncelle('ad', e.target.value)}
              className={inputCls} placeholder="Ahmet" required />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Soyad</label>
            <input type="text" value={form.soyad} onChange={(e) => guncelle('soyad', e.target.value)}
              className={inputCls} placeholder="Yılmaz" required />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">E-Posta</label>
          <input type="email" value={form.email} onChange={(e) => guncelle('email', e.target.value)}
            className={inputCls} placeholder="avukat@example.com" required />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Telefon</label>
          <input
            type="tel"
            value={form.telefon}
            onChange={(e) => guncelle('telefon', formatTelefon(e.target.value))}
            className={inputCls}
            placeholder="05XX XXX XX XX"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Şifre</label>
            <PasswordInput
              value={form.sifre}
              onChange={(v) => guncelle('sifre', v)}
              placeholder="En az 8 karakter"
              required
              minLength={8}
              className={inputCls}
            />
            <SifreGucGostergesi sifre={form.sifre} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Şifre Tekrar</label>
            <PasswordInput
              value={form.sifreTekrar}
              onChange={(v) => guncelle('sifreTekrar', v)}
              placeholder="••••••••"
              required
              className={inputCls}
            />
          </div>
        </div>

        {/* KVKK + Kullanım Koşulları — zorunlu */}
        <label className="flex items-start gap-2.5 cursor-pointer py-1">
          <input type="checkbox" checked={form.kvkk} onChange={(e) => guncelle('kvkk', e.target.checked)}
            className="mt-0.5 accent-[var(--gold)] w-4 h-4" />
          <span className="text-[11px] text-text-muted leading-relaxed">
            <button type="button" onClick={() => setYasalModal('kvkk')}
              className="text-gold hover:text-gold-light underline underline-offset-2 font-medium">
              KVKK Aydınlatma Metni
            </button>
            {'\u2019'}ni ve{' '}
            <button type="button" onClick={() => setYasalModal('kullanim')}
              className="text-gold hover:text-gold-light underline underline-offset-2 font-medium">
              Kullanım Koşulları
            </button>
            {'\u2019'}nı okudum, kabul ediyorum.
          </span>
        </label>

        {/* Ticari İleti İzni — isteğe bağlı */}
        <label className="flex items-start gap-2.5 cursor-pointer py-1">
          <input type="checkbox" checked={form.ticariIleti} onChange={(e) => guncelle('ticariIleti', e.target.checked)}
            className="mt-0.5 accent-[var(--gold)] w-4 h-4" />
          <span className="text-[11px] text-text-muted leading-relaxed">
            LexBase tarafından gönderilecek kampanya, güncelleme ve bilgilendirme içerikli{' '}
            <button type="button" onClick={() => setYasalModal('ticari')}
              className="text-gold hover:text-gold-light underline underline-offset-2 font-medium">
              ticari elektronik iletileri
            </button>
            {' '}almayı kabul ediyorum.
          </span>
        </label>

        {hata && (
          <div className="bg-red-dim border border-red/20 rounded-xl px-3 py-2.5 text-[11px] text-red">
            {hata}
          </div>
        )}

        <button type="submit" disabled={yukleniyor}
          className="w-full py-3 bg-gradient-to-r from-[#C9A84C] to-[#E0C068] text-[#0D1117] font-bold rounded-xl text-sm shadow-[0_4px_16px_rgba(201,168,76,0.3)] hover:shadow-[0_8px_24px_rgba(201,168,76,0.45)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {yukleniyor ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
        </button>
      </form>

      <p className="text-center text-[11px] text-text-dim">
        Zaten hesabınız var mı?{' '}
        <button type="button" onClick={onSwitchTab} className="text-gold hover:text-gold-light font-semibold transition-colors">
          Giriş Yap
        </button>
      </p>

      {/* KVKK Modal */}
      <InfoModal
        open={yasalModal === 'kvkk'}
        onClose={() => setYasalModal(null)}
        title="KVKK Aydınlatma Metni"
      >
        <KvkkIcerik />
      </InfoModal>

      {/* Kullanım Koşulları Modal */}
      <InfoModal
        open={yasalModal === 'kullanim'}
        onClose={() => setYasalModal(null)}
        title="Kullanım Koşulları"
      >
        <KullanimKosullariIcerik />
      </InfoModal>

      {/* Ticari İleti İzni Modal */}
      <InfoModal
        open={yasalModal === 'ticari'}
        onClose={() => setYasalModal(null)}
        title="Ticari Elektronik İleti İzni"
      >
        <TicariIletiIcerik />
      </InfoModal>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   YASAL İÇERİK BİLEŞENLERİ (AuthModal içi)
   ══════════════════════════════════════════════════════════════ */

/* ── KVKK Aydınlatma Metni İçeriği ────────────────────────── */
function KvkkIcerik() {
  return (
    <div className="space-y-4 text-sm text-text-muted leading-relaxed">
      <h3 className="text-base font-semibold text-text">Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni</h3>

      <p>
        LexBase Hukuk Bürosu Yönetim Platformu (&quot;Platform&quot;) olarak, 6698 sayılı Kişisel Verilerin Korunması
        Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu sıfatıyla, kişisel verilerinizin işlenmesine ilişkin
        aşağıdaki hususları bilgilerinize sunarız.
      </p>

      <h4 className="text-sm font-semibold text-text">1. İşlenen Kişisel Veriler</h4>
      <p>
        Kimlik bilgileri (ad, soyad), iletişim bilgileri (e-posta, telefon), mesleki bilgiler (baro sicil no,
        büro bilgileri), müvekkil ve dosya bilgileri, finansal veriler, oturum ve erişim logları.
      </p>

      <h4 className="text-sm font-semibold text-text">2. Kişisel Verilerin İşlenme Amacı</h4>
      <p>
        Platform hizmetlerinin sunulması, kullanıcı hesabının oluşturulması ve yönetimi, büro içi dosya ve
        müvekkil takibi, finansal raporlama, yasal yükümlülüklerin yerine getirilmesi.
      </p>

      <h4 className="text-sm font-semibold text-text">3. Kişisel Verilerin Aktarılması</h4>
      <p>
        Kişisel verileriniz, hizmet sağlayıcılarımız (Supabase, Cloudflare) ile yasal zorunluluklar
        kapsamında yetkili kurum ve kuruluşlarla paylaşılabilir.
      </p>

      <h4 className="text-sm font-semibold text-text">4. Veri Saklama Süresi</h4>
      <p>
        Kişisel verileriniz, işlenme amaçlarının gerektirdiği süre boyunca ve yasal saklama süreleri
        dahilinde muhafaza edilir. Hesap silinmesi halinde veriler makul sürede imha edilir.
      </p>

      <h4 className="text-sm font-semibold text-text">5. KVKK Kapsamındaki Haklarınız</h4>
      <p>
        KVKK&apos;nın 11. maddesi kapsamında; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse
        bilgi talep etme, işlenme amacını öğrenme, yurtiçinde veya yurtdışında aktarıldığı üçüncü kişileri
        bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme,
        otomatik analiz yoluyla aleyhinize bir sonuç çıkmasına itiraz etme haklarına sahipsiniz.
      </p>

      <p className="text-xs text-text-dim italic">
        Bu haklarınızı kullanmak için destek@lexbase.app adresine başvurabilirsiniz.
      </p>
    </div>
  );
}


/* ── Kullanım Koşulları İçeriği ───────────────────────────── */
function KullanimKosullariIcerik() {
  return (
    <div className="space-y-4 text-sm text-text-muted leading-relaxed">
      <h3 className="text-base font-semibold text-text">Kullanım Koşulları</h3>

      <p>
        Bu Kullanım Koşulları, LexBase Hukuk Bürosu Yönetim Platformu&apos;nun (&quot;Platform&quot;) kullanım
        şartlarını düzenler. Platformu kullanarak bu koşulları kabul etmiş sayılırsınız.
      </p>

      <h4 className="text-sm font-semibold text-text">1. Hizmet Tanımı</h4>
      <p>
        LexBase, avukatlar ve hukuk bürolarına yönelik müvekkil takibi, dosya yönetimi, finansal raporlama
        ve takvim yönetimi hizmetleri sunan bir bulut tabanlı SaaS platformudur.
      </p>

      <h4 className="text-sm font-semibold text-text">2. Hesap ve Güvenlik</h4>
      <p>
        Hesap oluşturarak doğru ve güncel bilgiler vermeyi kabul edersiniz. Hesap güvenliğinden siz
        sorumlusunuz. Şifrenizi üçüncü kişilerle paylaşmamalısınız.
      </p>

      <h4 className="text-sm font-semibold text-text">3. Kullanım Kuralları</h4>
      <p>
        Platformu yalnızca yasal amaçlarla kullanabilirsiniz. Platformun güvenliğini tehlikeye atacak,
        diğer kullanıcıların deneyimini olumsuz etkileyecek veya yasalara aykırı faaliyetler yasaktır.
      </p>

      <h4 className="text-sm font-semibold text-text">4. Fikri Mülkiyet</h4>
      <p>
        Platformun tasarımı, kodu, logosu ve içeriği LexBase&apos;e aittir. Girdiğiniz veriler üzerindeki
        haklar size aittir; LexBase bu verileri yalnızca hizmet sunumu amacıyla işler.
      </p>

      <h4 className="text-sm font-semibold text-text">5. Abonelik ve Ödeme</h4>
      <p>
        Platform ücretli abonelik modeli ile çalışır. Abonelik planları, ücretleri ve ödeme koşulları
        Platform üzerinde belirtilir. Abonelik iptali ve iade koşulları ilgili plan detaylarında yer alır.
      </p>

      <h4 className="text-sm font-semibold text-text">6. Sorumluluk Sınırı</h4>
      <p>
        Platform &quot;olduğu gibi&quot; sunulur. LexBase, Platformun kesintisiz veya hatasız çalışacağını
        garanti etmez. Veri kaybı, iş kaybı veya dolaylı zararlardan sorumlu tutulamaz.
      </p>

      <h4 className="text-sm font-semibold text-text">7. Değişiklikler</h4>
      <p>
        Bu koşulları önceden bildirmek suretiyle değiştirebiliriz. Değişiklik sonrası Platformu
        kullanmaya devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.
      </p>

      <p className="text-xs text-text-dim italic">
        Sorularınız için destek@lexbase.app adresine başvurabilirsiniz.
      </p>
    </div>
  );
}


/* ── Ticari Elektronik İleti İzni İçeriği ─────────────────── */
function TicariIletiIcerik() {
  return (
    <div className="space-y-4 text-sm text-text-muted leading-relaxed">
      <h3 className="text-base font-semibold text-text">Ticari Elektronik İleti Onay Metni</h3>

      <p>
        6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve Ticari İletişim ve Ticari Elektronik
        İletiler Hakkında Yönetmelik kapsamında aşağıdaki bilgilendirme yapılmaktadır.
      </p>

      <h4 className="text-sm font-semibold text-text">1. Veri Sorumlusu</h4>
      <p>
        <strong>EMD Yazılım</strong> (&ldquo;LexBase&rdquo;) tarafından ticari elektronik ileti gönderilmesi amacıyla
        iletişim bilgileriniz (e-posta adresi, telefon numarası) işlenmektedir.
      </p>

      <h4 className="text-sm font-semibold text-text">2. İleti Kapsamı</h4>
      <p>
        Onay vermeniz halinde; LexBase platformuna ilişkin yeni özellik duyuruları, kampanya ve indirimler,
        hizmet güncellemeleri, eğitim içerikleri ve sektörel bilgilendirmeler e-posta ve/veya SMS yoluyla
        tarafınıza gönderilebilecektir.
      </p>

      <h4 className="text-sm font-semibold text-text">3. Onayın İsteğe Bağlılığı</h4>
      <p>
        Ticari elektronik ileti onayı tamamen isteğe bağlıdır. Onay vermemeniz halinde platform hizmetlerinden
        eksiksiz yararlanmaya devam edebilirsiniz. Onay vermemeniz yalnızca pazarlama amaçlı iletilerin
        gönderilmemesi sonucunu doğurur.
      </p>

      <h4 className="text-sm font-semibold text-text">4. Onayın Geri Alınması</h4>
      <p>
        Verdiğiniz onayı dilediğiniz zaman, herhangi bir gerekçe belirtmeksizin geri alabilirsiniz. Bunun için:
      </p>
      <ul className="list-disc list-inside space-y-1 text-sm text-text-muted">
        <li>Gelen iletideki &ldquo;abonelikten çık&rdquo; bağlantısını kullanabilirsiniz</li>
        <li>Ayarlar sayfasından ticari ileti tercihlerinizi güncelleyebilirsiniz</li>
        <li><strong>destek@lexbase.app</strong> adresine yazılı bildirimde bulunabilirsiniz</li>
      </ul>
      <p>
        Ret talebiniz en geç <strong>3 iş günü</strong> içinde işleme alınacaktır.
      </p>

      <h4 className="text-sm font-semibold text-text">5. Yasal Dayanak</h4>
      <p>
        Bu onay metni, 6563 sayılı Kanun&apos;un 6. maddesi, 6698 sayılı KVKK ve ilgili yönetmelikler
        çerçevesinde hazırlanmıştır.
      </p>

      <p className="text-xs text-text-dim italic">
        Sorularınız için destek@lexbase.app adresine başvurabilirsiniz.
      </p>
    </div>
  );
}
