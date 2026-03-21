// ── Badge renk haritaları (merkezi) ─────────────────────────

/** Dava aşaması renkleri */
export const ASAMA_RENK: Record<string, string> = {
  'İlk Derece': 'text-blue-400 bg-blue-400/10',
  'İstinaf': 'text-purple-400 bg-purple-400/10',
  'Temyiz (Yargıtay)': 'text-orange-400 bg-orange-400/10',
  'Temyiz (Danıştay)': 'text-orange-400 bg-orange-400/10',
  'Kesinleşti': 'text-green bg-green-dim',
  'Düşürüldü': 'text-text-dim bg-surface2',
};

/** Dosya durum renkleri (tüm dosya türleri için) */
export const DURUM_RENK: Record<string, string> = {
  'Derdest': 'text-green bg-green-dim border-green/20',
  'Aktif': 'text-green bg-green-dim border-green/20',
  'derdest': 'text-green bg-green-dim border-green/20',
  'Devam Ediyor': 'text-green bg-green-dim border-green/20',
  'Hazırlık Aşamasında': 'text-gold bg-gold-dim border-gold/20',
  'Beklemede': 'text-gold bg-gold-dim border-gold/20',
  'Başvuru': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Görüşme': 'text-gold bg-gold-dim border-gold/20',
  'Hazırlandı': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Gönderildi': 'text-gold bg-gold-dim border-gold/20',
  'Tebliğ Edildi': 'text-green bg-green-dim border-green/20',
  'Kapandı': 'text-text-dim bg-surface2 border-border',
  'kapandi': 'text-text-dim bg-surface2 border-border',
  'Kapalı': 'text-text-dim bg-surface2 border-border',
  'Tamamlandı': 'text-text-dim bg-surface2 border-border',
  'Anlaşma': 'text-green bg-green-dim border-green/20',
  'Anlaşamama': 'text-red bg-red-dim border-red/20',
  'Kazanıldı': 'text-green bg-green-dim border-green/20',
  'Kaybedildi': 'text-red bg-red-dim border-red/20',
  'Taslak': 'text-text-dim bg-surface2 border-border',
};
