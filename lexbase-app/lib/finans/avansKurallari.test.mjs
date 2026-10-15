import test from 'node:test';
import assert from 'node:assert/strict';
import { hesaplaKasaOzet, hesaplaTumKasalar } from './avansKurallari.ts';
import { dosyaMasrafOzeti } from '../utils/finans.ts';
import { karZararHesapla, raporDonemindeMi } from './raporHesaplari.ts';

const hareket = (tip, tutar, muvId = 'a') => ({ tip, tutar, muvId });

test('client expense deficit remains separate from fee receipts', () => {
  const ozet = hesaplaKasaOzet([hareket('alim', 1000), hareket('masraf', 1500), hareket('akdi_vekalet', 2000)]);
  assert.equal(ozet.bakiye, -500);
  assert.equal(ozet.masrafAlacagi, 500);
  assert.equal(ozet.emanetBakiyesi, 0);
});

test('one client advance cannot offset another client expense debt', () => {
  const kasalar = hesaplaTumKasalar([hareket('alim', 1000), hareket('masraf', 500, 'b')]);
  assert.equal(kasalar.get('a').emanetBakiyesi, 1000);
  assert.equal(kasalar.get('b').masrafAlacagi, 500);
});

test('refunds reduce held advances; deleted and invalid movements are excluded', () => {
  const ozet = hesaplaKasaOzet([hareket('alim', '1000'), hareket('iade', 200),
    { ...hareket('masraf', 500), _silindi: true }, hareket('masraf', 'bad'), hareket('alim', -10)]);
  assert.equal(ozet.emanetBakiyesi, 800);
  assert.equal(ozet.hareketSayisi, 2);
  assert.equal(ozet.gecersizHareketSayisi, 2);
});

test('client-owned costs do not reduce office income', () => {
  const record = { tahsilatlar: [{ tur: 'akdi_vekalet', tutar: 2000, tarih: '2026-10-14' }],
    harcamalar: [{ tutar: 700 }, { tutar: 300, masrafSahibi: 'buro' }] };
  assert.deepEqual(dosyaMasrafOzeti(record), { buro: 300, muvekkil: 700 });
  const rapor = karZararHesapla({ davalar: [record] });
  assert.equal(rapor.gelirler.toplam, 2000);
  assert.equal(rapor.muvekkilMasraflari, 700);
  assert.equal(rapor.giderler.toplam, 300);
  assert.equal(rapor.net, 1700);
});

test('archived finance is retained, deleted finance is excluded', () => {
  const record = { tahsilatlar: [{ tur: 'akdi_vekalet', tutar: 100 }] };
  assert.equal(karZararHesapla({ davalar: [{ ...record, _arsivlendi: true }, { ...record, _silindi: true }] }).gelirler.toplam, 100);
});

test('undated movements remain all-time only and impossible dates are rejected', () => {
  assert.equal(raporDonemindeMi('', undefined), true);
  assert.equal(raporDonemindeMi('', 2026), false);
  assert.equal(raporDonemindeMi('2026-02-30', 2026), false);
  assert.equal(raporDonemindeMi('2026-10-14', 2026, 10), true);
});
