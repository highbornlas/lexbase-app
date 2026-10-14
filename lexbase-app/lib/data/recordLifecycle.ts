import type { SupabaseClient } from '@supabase/supabase-js';

export type DurumTablosu = 'davalar' | 'icra' | 'arabuluculuk' | 'ihtarnameler' | 'danismanlik' | 'muvekkillar';
export type DurumIslemi = 'arsivle' | 'arsivden_cikar' | 'sil' | 'geri_yukle' | 'kalici_sil';

export async function recordLifecycle(client: Pick<SupabaseClient, 'rpc'>, table: DurumTablosu,
  id: string, buroId: string | null | undefined, operation: DurumIslemi) {
  if (!buroId || !id) throw new Error('Buro ve kayit kimligi gerekli');
  const { data, error } = await client.rpc('kayit_durum_islemi', {
    p_buro_id: buroId, p_tablo: table, p_id: id, p_islem: operation,
  });
  if (error) throw error;
  if (data?.id !== id || data?.islem !== operation) throw new Error('Durum islemi dogrulanamadi');
}
