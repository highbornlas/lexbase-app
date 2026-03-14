'use client';

export default function DestekPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-1">Destek</h1>
      <p className="text-sm text-text-muted mb-6">Yardım ve iletişim</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {/* İletişim */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-text mb-4">📞 İletişim</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface2 rounded-[10px]">
              <span className="text-lg">📧</span>
              <div>
                <div className="text-xs font-semibold text-text">E-posta</div>
                <div className="text-sm text-gold">destek@lexbase.app</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface2 rounded-[10px]">
              <span className="text-lg">📞</span>
              <div>
                <div className="text-xs font-semibold text-text">Telefon</div>
                <div className="text-sm text-text-muted">+90 (212) 000 00 00</div>
              </div>
            </div>
          </div>
        </div>

        {/* SSS */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-text mb-4">❓ Sıkça Sorulan Sorular</h2>
          <div className="space-y-3">
            {[
              { s: 'Nasıl başlayabilirim?', c: 'Kayıt olduktan sonra müvekkil ekleyerek başlayabilirsiniz.' },
              { s: 'Verilerim güvende mi?', c: 'Tüm veriler şifreli olarak Türkiye sunucularında saklanır.' },
              { s: 'Planımı nasıl yükseltirim?', c: 'Ayarlar > Plan bölümünden planınızı değiştirebilirsiniz.' },
              { s: 'Mobil uygulama var mı?', c: 'iOS ve Android uygulamamız App Store ve Google Play\'de mevcuttur.' },
            ].map((item) => (
              <details key={item.s} className="bg-surface2 rounded-[10px] group">
                <summary className="px-4 py-3 text-sm font-medium text-text cursor-pointer hover:text-gold transition-colors list-none flex items-center justify-between">
                  {item.s}
                  <span className="text-text-dim group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <div className="px-4 pb-3 text-xs text-text-muted">{item.c}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Destek Talebi */}
        <div className="card p-6 md:col-span-2">
          <h2 className="text-base font-semibold text-text mb-4">📋 Destek Talebi Oluştur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Konu</label>
              <select className="form-input">
                <option>Teknik Sorun</option>
                <option>Özellik İsteği</option>
                <option>Fatura / Ödeme</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Öncelik</label>
              <select className="form-input">
                <option>Normal</option>
                <option>Yüksek</option>
                <option>Acil</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-text-muted mb-1.5">Açıklama</label>
              <textarea
                rows={4}
                placeholder="Sorununuzu detaylı açıklayın..."
                className="form-input resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="btn-gold">
                Talebi Gönder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
