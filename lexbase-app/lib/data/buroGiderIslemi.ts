import { buroGiderKaydi } from '../finans/giderKurallari.ts';

interface QueryResult { data: { id?: string; data?: Record<string, unknown> } | null; error: unknown }
interface GiderQuery {
  select(columns: string): GiderQuery;
  eq(column: string, value: string): GiderQuery;
  single(): PromiseLike<QueryResult>;
}
interface GiderClient { from(table: string): {
  select(columns: string): GiderQuery;
  upsert(row: Record<string, unknown>): GiderQuery;
  update(row: Record<string, unknown>): GiderQuery;
} }

export async function buroGiderIslemi(supabase: unknown, buroId: string | null | undefined,
  gider: Record<string, unknown>, sil = false, beklenen?: Record<string, unknown>) {
  const client = supabase as GiderClient;
  if (!buroId) throw new Error('Büro bulunamadı.');
  if (typeof gider.id !== 'string' || !gider.id) throw new Error('Gider bulunamadı.');
  let result: QueryResult;
  if (sil) {
    const mevcut = await client.from('buro_giderleri').select('id, data').eq('id', gider.id).eq('buro_id', buroId).single();
    if (mevcut.error || !mevcut.data?.data) throw new Error('Gider okunamadı; silme işlemi yapılmadı.');
    result = await client.from('buro_giderleri').update({ data: { ...mevcut.data.data, _silindi: new Date().toISOString() } })
      .eq('id', gider.id).eq('buro_id', buroId).eq('data', JSON.stringify(mevcut.data.data)).select('id').single();
  } else {
    const { id, ...data } = buroGiderKaydi(gider);
    if (beklenen) {
      if (beklenen.id !== id) throw new Error('Düzenlenen gider kimliği eşleşmiyor.');
      const expected = { ...beklenen }; delete expected.id;
      result = await client.from('buro_giderleri').update({ data }).eq('id', id).eq('buro_id', buroId)
        .eq('data', JSON.stringify(expected)).select('id').single();
      if (result.error || result.data?.id !== id) {
        // A lost response may follow a successful update; confirm the exact intended payload before retrying.
        const confirmed = await client.from('buro_giderleri').select('id').eq('id', id).eq('buro_id', buroId)
          .eq('data', JSON.stringify(data)).single();
        if (!confirmed.error && confirmed.data?.id === id) return id;
        throw new Error('Gider değişmiş veya kayıt doğrulanamamış olabilir. Bilgileriniz korunuyor; sayfayı yenileyip kontrol ediniz.');
      }
    } else result = await client.from('buro_giderleri').upsert({ id, buro_id: buroId, data }).select('id').single();
  }
  if (result.error || result.data?.id !== gider.id) throw new Error('İşlem doğrulanamadı. Bilgileriniz korunuyor; aynı kayıtla tekrar deneyiniz.');
  return gider.id;
}
