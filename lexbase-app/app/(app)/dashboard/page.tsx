export default function DashboardPage() {
  return (
    <div>
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-6">
        Dashboard
      </h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* KPI Strip — RPC'den veri çekilecek */}
        {['Aktif Davalar', 'İcra Dosyaları', 'Müvekkiller', 'Aylık Gelir'].map((label) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
            <div className="font-[var(--font-playfair)] text-2xl text-gold font-bold">—</div>
          </div>
        ))}
      </div>
      <div className="bg-surface border border-border rounded-lg p-6 text-center text-text-muted text-sm">
        Dashboard içeriği Faz 4&apos;te tamamlanacak
      </div>
    </div>
  );
}
