/**
 * Uygulama sürüm bilgisi
 *
 * Bu dosya her güncelleme ile otomatik artırılır.
 * Format: MAJOR.MINOR.PATCH
 * - MAJOR: Büyük yapısal değişiklikler
 * - MINOR: Yeni özellik eklemeleri
 * - PATCH: Hata düzeltmeleri, küçük iyileştirmeler
 */

export const APP_VERSION = '2.3.0';

export const BUILD_DATE = '2026-03-21';

export const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
  {
    version: '2.3.0',
    date: '2026-03-21',
    changes: [
      'N+1 query düzeltmeleri — server-side filtreleme',
      '42 empty catch block düzeltmesi — hata loglama eklendi',
      'Renk/durum sabitleri merkezileştirildi',
      'TypeScript any type temizliği',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-03-21',
    changes: [
      'Kapsamlı güvenlik düzeltmeleri (XSS, RLS, credential temizliği)',
      'TIFF dosya önizleme desteği',
      'Otomatik sürüm takip sistemi',
    ],
  },
  {
    version: '2.1.0',
    date: '2026-03-20',
    changes: [
      'UDF parser v8: table çerçeve, numaralı paragraf desteği',
      'Inspector paneli iyileştirmeleri',
    ],
  },
];
