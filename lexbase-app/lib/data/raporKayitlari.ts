interface Row { id: string; data: Record<string, unknown> }
interface Query extends PromiseLike<{ data: Row[] | null; error: unknown }> {
  select(columns: string): Query;
  eq(column: string, value: string): Query;
  or(filters: string): Query;
  gt(column: string, value: string): Query;
  order(column: string, options: { ascending: boolean }): Query;
  limit(count: number): Query;
}
interface Client { from(table: string): Query }
const TABLES = ['davalar', 'icra', 'danismanlik', 'arabuluculuk', 'ihtarnameler', 'muvekkillar', 'buro_giderleri', 'avans_hareketleri'];

// Keyset pagination avoids silently reporting only the API's first page.
export async function raporKayitlariniOku(supabase: unknown, table: string, buroId: string, muvId?: string, includeRelated = false) {
  if (!buroId || !TABLES.includes(table)) throw new Error('Geçersiz rapor kapsamı.');
  const client = supabase as Client;
  const rows: Row[] = [];
  let cursor = '';
  for (let page = 0; page < 2000; page++) {
    let query = client.from(table).select('id, data').eq('buro_id', buroId).order('id', { ascending: true }).limit(500);
    if (muvId) {
      if (includeRelated) {
        if (!/^[a-zA-Z0-9_-]+$/.test(muvId)) throw new Error('Geçersiz müvekkil kimliği.');
        query = query.or(`data->>muvId.eq.${muvId},data->muvekkilTaraflar.cs.[{"id":"${muvId}"}]`);
      } else query = query.eq('data->>muvId', muvId);
    }
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Rapor verisi doğrulanamadı.');
    if (data.length === 0) return rows;
    for (const row of data) {
      if (typeof row.id !== 'string' || row.id <= cursor) throw new Error('Rapor sıralaması doğrulanamadı.');
      rows.push(row); cursor = row.id;
    }
    // Fetch to an empty page: a server-side cap can be lower than our requested limit.
  }
  throw new Error('Rapor kayıt sınırını aşıyor; eksik toplam gösterilmedi.');
}
