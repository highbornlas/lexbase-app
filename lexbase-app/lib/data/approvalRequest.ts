export interface ApprovalRequest {
  modul: string;
  islem_tipi: string;
  hedef_tablo: string;
  hedef_kayit_id?: string;
  veri: Record<string, unknown>;
  aciklama?: string;
  ekler?: string[];
  tutar?: number;
}

interface RpcClient {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{
    data: unknown; error: { code?: string; message?: string } | null;
  }>;
}

export function approvalErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === '42501') return 'Bu büroda işlem yetkisi bulunamadı.';
  if (code === '40001') return 'Talep başka bilgilerle kaydedilmiş. Listeyi yenileyip kontrol edin.';
  if (code === 'PGRST202' || code === '42883') return 'Güvenli onay işlemi henüz sunucuda etkin değil. İşlem yapılmadı.';
  if (code === '22023' || code === '22P02') return 'Talep bilgileri geçersiz. Bilgileri kontrol edin.';
  if (error instanceof Error) return error.message;
  return 'İşlem doğrulanamadı. Bilgileriniz korunuyor; yeniden denemeden önce kayıtları kontrol edin.';
}

export async function createApprovalRequest(client: RpcClient, buroId: string | null | undefined,
  requestId: string, input: ApprovalRequest) {
  if (!buroId || !requestId) throw new Error('Buro ve talep kimligi gerekli');
  const { data, error } = await client.rpc('onay_talebi_olustur', {
    p_buro_id: buroId, p_id: requestId, p_talep: input,
  });
  if (error) throw error;
  const result = data as { id?: unknown; bildirim_sayisi?: unknown } | null;
  if (!result || result.id !== requestId || typeof result.bildirim_sayisi !== 'number'
    || !Number.isSafeInteger(result.bildirim_sayisi) || result.bildirim_sayisi < 0) {
    throw new Error('Onay talebi sonucu dogrulanamadi. Yeniden denemede ayni talep kimligini kullanin.');
  }
  return { id: requestId, bildirim_sayisi: result.bildirim_sayisi };
}
