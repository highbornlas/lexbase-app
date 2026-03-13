export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-[var(--font-playfair)] text-3xl text-gold font-bold">
            LexBase
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Hukuk Bürosu Yönetim Sistemi
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
