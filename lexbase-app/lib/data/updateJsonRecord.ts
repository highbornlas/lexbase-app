import type { SupabaseClient } from '@supabase/supabase-js';

export async function updateRecordStatus(
  client: Pick<SupabaseClient, 'from'>,
  table: 'danismanlik' | 'arabuluculuk',
  id: string,
  buroId: string,
  flag: '_silindi' | '_arsivlendi',
) {
  const { data: current, error: readError } = await client.from(table)
    .select('data').eq('id', id).eq('buro_id', buroId).single();
  if (readError) throw readError;
  if (!current) throw new Error('Kayit bulunamadi');
  const { data: saved, error: writeError } = await client.from(table)
    .update({ data: { ...current.data, [flag]: new Date().toISOString() } })
    .eq('id', id).eq('buro_id', buroId).select('id').single();
  if (writeError) throw writeError;
  if (!saved) throw new Error('Kayit guncellenemedi');
}
