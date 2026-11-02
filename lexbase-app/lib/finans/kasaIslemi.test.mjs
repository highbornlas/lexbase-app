import test from 'node:test';
import assert from 'node:assert/strict';
import { kasaIslemiYap, kasaIslemHatasi, masraflariKoruyarakDosyaKaydet } from '../data/financeCashTransaction.ts';
import { vergiOzetiHesapla } from './raporHesaplari.ts';

const hareket = { id: 'expense', muvId: 'client', tip: 'masraf', tarih: '2026-10-14', tutar: 500 };
function fake(result = { data: { id: 'expense' }, error: null }) {
  const calls = [];
  return { calls, rpc: async (name, args) => { calls.push({ name, args }); return result; } };
}

test('expense uses one RPC, including the expected snapshot and office scope', async () => {
  const client = fake();
  await kasaIslemiYap(client, 'office', { islem: 'kaydet', kaynak: 'dosya', dosyaTur: 'Dava', dosyaId: 'case', hareket, beklenen: hareket });
  assert.equal(client.calls.length, 1);
  assert.equal(client.calls[0].name, 'finans_kasa_islemi');
  assert.equal(client.calls[0].args.p_buro_id, 'office');
  assert.deepEqual(client.calls[0].args.p_beklenen, hareket);
});

test('failed RPC never falls back to separate writes', async () => {
  const client = fake({ data: null, error: { code: 'PGRST202' } });
  await assert.rejects(kasaIslemiYap(client, 'office', { islem: 'kaydet', hareket }), { code: 'PGRST202' });
  assert.equal(client.calls.length, 1);
  assert.match(kasaIslemHatasi({ code: 'PGRST202' }), /etkin değil/);
});

test('missing office and invalid currency or dates are rejected before RPC', async () => {
  const client = fake();
  await assert.rejects(kasaIslemiYap(client, null, { islem: 'kaydet', hareket }));
  for (const fields of [{ tutar: NaN }, { tutar: -1 }, { tutar: 1.001 }, { tarih: '2026-02-30' }]) {
    await assert.rejects(kasaIslemiYap(client, 'office', { islem: 'kaydet', hareket: { ...hareket, ...fields } }));
  }
  assert.equal(client.calls.length, 0);
});

test('delete sends a cash snapshot; no successful response means no success', async () => {
  const client = fake();
  await kasaIslemiYap(client, 'office', { islem: 'sil', hareket, beklenen: hareket });
  assert.equal(client.calls[0].args.p_islem, 'sil');
  assert.deepEqual(client.calls[0].args.p_beklenen, hareket);
  await assert.rejects(kasaIslemiYap(fake({ data: { id: 'wrong' }, error: null }), 'office', { islem: 'sil', hareket }));
});

test('general case edits use the protected writer, not an upsert', async () => {
  const client = fake();
  await masraflariKoruyarakDosyaKaydet(client, 'office', 'Dava', { id: 'expense', muvId: 'client', harcamalar: [] });
  assert.equal(client.calls[0].name, 'finans_dosya_kaydet');
  assert.equal(client.calls[0].args.p_data.id, undefined);
  assert.equal(client.calls[0].args.p_id, 'expense');
});

test('tax record summary includes actual receipts only and excludes deleted expenses', () => {
  const report = vergiOzetiHesapla([
    { makbuzKesildi: true, tarih: '2026-10-14', kdvTutar: 100, stopajTutar: 20 },
    { makbuzKesildi: false, tarih: '2026-10-14', kdvTutar: 900 },
    { makbuzKesildi: true, tarih: '2026-02-30', kdvTutar: 900 },
  ], [
    { tarih: '2026-10-14', kdvTutar: 30 },
    { tarih: '2026-10-14', kdvTutar: 900, _silindi: true },
  ], 2026, 4);
  assert.equal(report.toplamGelirKdv, 100);
  assert.equal(report.toplamGiderKdv, 30);
  assert.equal(report.odenecekKdv, 70);
});
