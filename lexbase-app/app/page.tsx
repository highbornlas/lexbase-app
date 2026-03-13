import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center">
      <h1 className="font-[var(--font-playfair)] text-5xl text-gold font-bold mb-4">
        LexBase
      </h1>
      <p className="text-text-muted text-lg mb-8 max-w-md text-center">
        Hukuk bürolarının dijital dönüşüm ortağı. Dosya, müvekkil, finans — tek platformda.
      </p>
      <div className="flex gap-4">
        <Link
          href="/giris"
          className="px-8 py-3 bg-gold text-bg font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors"
        >
          Giriş Yap
        </Link>
        <Link
          href="/kayit"
          className="px-8 py-3 border border-gold text-gold font-semibold rounded-lg text-sm hover:bg-gold-dim transition-colors"
        >
          Kayıt Ol
        </Link>
      </div>
    </div>
  );
}
