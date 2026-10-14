import { raporTarihi } from '../finans/raporHesaplari.ts';

export type DosyaTuru = 'Dava' | 'İcra' | 'Arabuluculuk' | 'İhtarname';
export interface DosyaMasraf {
  id: string; tutar: number; tarih?: string; kat?: string; acik?: string; masrafSahibi?: string;
}
export interface KasaIslemi {
  islem: 'kaydet' | 'sil';
  hareket: Record<string, unknown>;
  kaynak?: 'kasa' | 'dosya';
  dosyaTur?: DosyaTuru;
  dosyaId?: string;
  beklenen?: Record<string, unknown> | null;
}
interface RpcClient {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown; error: { code?: string; message?: string } | null;
  }>;
}

export function kasaIslemHatasi(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === '40001') return 'Kayıt başka bir oturumda değişti. Sayfayı yenileyip tekrar deneyin.';
  if (code === 'PGRST202' || code === '42883') return 'Güvenli kasa işlemi henüz sunucuda etkin değil. Kayıt yapılmadı.';
  if (code === '42501') return 'Bu büroda işlem yetkisi bulunamadı veya kayıt erişimi reddedildi.';
  if (code === '22023') return 'Kayıt bilgileri veya dosya-kasa eşleşmesi geçersiz. İşlem yapılmadı.';
  if (code === 'P0002') return 'Dosya, müvekkil veya hareket bulunamadı. Sayfayı yenileyin.';
  return 'İşlem doğrulanamadı. Bilgileriniz korunuyor; tekrar denemeden önce kayıtları kontrol edin.';
}

export async function kasaIslemiYap(client: RpcClient, buroId: string | null | undefined, input: KasaIslemi) {
  if (!buroId) throw new Error('Buro bulunamadi');
  if (typeof input.hareket.id !== 'string' || !input.hareket.id) throw new Error('Hareket kimligi gerekli');
  if (input.islem === 'kaydet') {
    const tutar = Number(input.hareket.tutar);
    if (!Number.isFinite(tutar) || tutar <= 0 || tutar >= 1e12
      || !/^\d+(\.\d{1,2})?$/.test(String(input.hareket.tutar)) || !raporTarihi(input.hareket.tarih)) {
      throw new Error('Tutar veya tarih gecersiz');
    }
  }
  const { data, error } = await client.rpc('finans_kasa_islemi', {
    p_buro_id: buroId, p_islem: input.islem, p_hareket: input.hareket,
    p_kaynak: input.kaynak || 'kasa', p_dosya_tur: input.dosyaTur || null,
    p_dosya_id: input.dosyaId || null, p_beklenen: input.beklenen || null,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || (data as { id?: unknown }).id !== input.hareket.id) {
    throw new Error('Kasa islemi dogrulanamadi');
  }
  return data;
}

export async function masraflariKoruyarakDosyaKaydet(client: RpcClient, buroId: string, dosyaTur: DosyaTuru, kayit: Record<string, unknown>) {
  const { id, ...payload } = kayit;
  const { data, error } = await client.rpc('finans_dosya_kaydet', {
    p_buro_id: buroId, p_dosya_tur: dosyaTur, p_id: id, p_data: payload,
  });
  if (error) throw error;
  if (!data || typeof data !== 'object' || (data as { id?: unknown }).id !== id) throw new Error('Dosya kaydi dogrulanamadi');
}
