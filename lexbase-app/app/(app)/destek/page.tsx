'use client';

export default function DestekPage() {
  return (
    <div>
      <h1 className="font-[var(--font-playfair)] text-2xl text-text font-bold mb-1">Destek</h1>
      <p className="text-sm text-text-muted mb-6">Yardım ve iletişim</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* İletişim */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-text mb-4">📞 İletişim</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface2 rounded-lg">
              <span className="text-lg">📧</span>
              <div>
                <div className="text-xs font-semibold text-text">E-posta</div>
                <div className="text-sm text-gold">destek@lexbase.app</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-surface2 rounded-lg">
              <span className="text-lg">📞</span>
              <div>
                <div className="text-xs font-semibold text-text">Telefon</div>
                <div className="text-sm text-text-muted">+90 (212) 000 00 00</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#25D366]/10 rounded-lg border border-[#25D366]/20">
              <span className="text-lg">📱</span>
              <div>
                <div className="text-xs font-semibold text-[#25D366]">WhatsApp Destek</div>
                <div className="text-sm text-text-muted">Hızlı yanıt almak için WhatsApp ile yazın</div>
              </div>
            </div>
          </div>
        </div>

        {/* SSS */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="text-base font-semibold text-text mb-4">❓ Sıkça Sorulan Sorular</h2>
          <div className="space-y-3">
            {[
              { s: 'Nasıl başlayabilirim?', c: 'Kayıt olduktan sonra müvekkil ekleyerek başlayabilirsiniz.' },
              { s: 'Verilerim güvende mi?', c: 'Tüm veriler şifreli olarak Türkiye sunucularında saklanır.' },
              { s: 'Planımı nasıl yükseltirim?', c: 'Ayarlar > Plan bölümünden planınızı değiştirebilirsiniz.' },
              { s: 'Mobil uygulama var mı?', c: 'iOS ve Android uygulamamız App Store ve Google Play\'de mevcuttur.' },
            ].map((item) => (
              <details key={item.s} className="bg-surface2 rounded-lg">
                <summary className="px-4 py-3 text-sm font-medium text-text cursor-pointer hover:text-gold transition-colors">
                  {item.s}
                </summary>
                <div className="px-4 pb-3 text-xs text-text-muted">{item.c}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Destek Talebi */}
        <div className="bg-surface border border-border rounded-lg p-6 md:col-span-2">
          <h2 className="text-base font-semibold text-text mb-4">📋 Destek Talebi Oluştur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Konu</label>
              <select className="w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold transition-colors">
                <option>Teknik Sorun</option>
                <option>Özellik İsteği</option>
                <option>Fatura / Ödeme</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Öncelik</label>
              <select className="w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-text focus:outline-none focus:border-gold transition-colors">
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
                className="w-full px-3 py-2.5 bg-surface2 border border-border rounded-lg text-sm text-text placeholder:text-text-dim focus:outline-none focus:border-gold transition-colors resize-none"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button className="px-6 py-2.5 bg-gold text-bg font-semibold rounded-lg text-sm hover:bg-gold-light transition-colors">
                Talebi Gönder
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
