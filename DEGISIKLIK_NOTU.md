# LexBase — Değişiklik Notu

## ⚠️ Önemli Not: XSS Düzeltmeleri Hakkında

Otomatik XSS düzeltme scripti bazı render fonksiyonlarını, CSS değerlerini ve HTML-üreten fonksiyon çağrılarını da yanlışlıkla escape'lemişti. Bu durum butonların ve modüllerin çalışmamasına neden oluyordu.

**Çözüm:** Agresif otomatik düzeltmeler geri alındı. 14 dosya orijinal haline döndürüldü. `escHTML()` fonksiyonu `security.js`'de hazır duruyor — ileride el ile, dosya dosya uygulanmalı.

### Güvenli XSS uygulama kuralları:
1. **SADECE kullanıcı metnine uygula:** `${escHTML(m.ad)}`, `${escHTML(d.konu)}`
2. **CSS değerlerine UYGULAMA:** `color:${ARENK[...]}` — olduğu gibi bırak
3. **Class adlarına UYGULAMA:** `badge-${durum}` — olduğu gibi bırak
4. **HTML döndüren fonksiyonlara UYGULAMA:** `bilgiKutusu()`, `skorBadge()` gibi
5. **onclick parametrelerine DİKKAT:** ID'ler güvenli, ama metin parametreleri `escAttr()` kullan
6. **option selected gibi attribute'lara UYGULAMA**

---

## Yapılan Değişiklikler (Güncel)

### Değişen Dosyalar (10)
| Dosya | Değişiklik |
|-------|-----------|
| admin.js | Güvenlik uyarısı, hata loglama |
| app.js | Duplicate danismanlik init kaldırıldı |
| auth.js | Bildirim.baslat() eklendi |
| ayarlar.js | Bildirim ayarları render eklendi |
| davalar.js | Silme işlemi custom dialog |
| plan.js | uid() → crypto.randomUUID() |
| state.js | loadData hata yönetimi, saveData iyileştirme |
| supabase-client.js | saveData override netleştirildi, event bus, bildirim |
| ui.js | Mobil sidebar toggle, sayfa geçişinde kapanma |
| utils.js | Log modal XSS koruması (el ile) |

### Yeni Dosyalar (3)
| Dosya | İşlev |
|-------|-------|
| security.js | escHTML(), onayDialog(), silmeOnay() |
| eventbus.js | Event bus, stateEkle/Sil/Güncelle |
| bildirim.js | Bildirim merkezi, browser notification |

### Diğer Değişiklikler
| Dosya | Değişiklik |
|-------|-----------|
| index.html | Hamburger menü, sidebar overlay, bildirim çanı, bildirim ayarları, security/eventbus/bildirim script eklendi, WebP picture element |
| style.css | Responsive layout (3 breakpoint), bildirim panel CSS, dialog CSS, skeleton, touch cihaz optimizasyonu, safe-area |
| images/*.webp | PNG→WebP (%98 küçülme) |
