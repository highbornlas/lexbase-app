'use client';

import Link from 'next/link';

export default function KayitPage() {
  return (
    <div className="bg-surface border border-border rounded-xl p-8">
      <h2 className="text-lg font-semibold text-text mb-6">Kayıt Ol</h2>
      <div className="text-center text-text-muted text-sm py-8">
        Kayıt formu Faz 4&apos;te tamamlanacak
      </div>
      <div className="text-center text-xs text-text-dim">
        Zaten hesabınız var mı?{' '}
        <Link href="/giris" className="text-gold hover:text-gold-light">
          Giriş Yap
        </Link>
      </div>
    </div>
  );
}
