import type { SupabaseClient } from '@supabase/supabase-js';

export const TRASH_TABLES = ['muvekkillar','karsi_taraflar','vekillar','davalar','icra','ihtarnameler','arabuluculuk','danismanlik'] as const;
export async function readTrashRecords(client: Pick<SupabaseClient, 'from'>, buroId: string) {
  return (await Promise.all(TRASH_TABLES.map(async table => {
    const rows: { id: string; data: Record<string, unknown>; table: typeof table }[] = [];
    const pageSize = 250;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client.from(table).select('id, data').eq('buro_id',buroId)
        .not('data->>_silindi','is',null).order('id',{ ascending: true }).range(offset,offset+pageSize-1);
      if (error) throw error;
      if (!data) throw new Error('Cop kutusu verisi okunamadi');
      rows.push(...data.map(row => ({ id: row.id, data: row.data as Record<string, unknown>, table })));
      if (data.length < pageSize) return rows;
    }
  }))).flat();
}
