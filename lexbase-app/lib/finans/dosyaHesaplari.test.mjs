import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dosyaParaOzeti, dosyaMasrafToplami, anlasilanUcret } from '../utils/finans.ts';
import { gelirTahsilatiMi, ucretTahsilatiMi } from './gelirKurallari.ts';

test('mixed case movements keep client money, office income and contractual payment distinct', () => {
  const tahsilatlar = [
    { tur: 'tahsilat', tutar: 10000 }, { tur: 'akdi_vekalet', tutar: 2000 },
    { tur: 'hakediş', tutar: 500 }, { tur: 'icra_vekalet', tutar: 300 },
    { tur: 'aktarim', tutar: 8000 }, { tur: 'iade', tutar: 200 },
    { tur: 'unknown', tutar: 100 },
  ];
  const ozet = dosyaParaOzeti({ tahsilatlar, tahsil: 99000, tahsilEdildi: 88000 });
  assert.equal(ozet.karsiTaraf, 10000);
  assert.equal(ozet.buroGelir, 2800);
  assert.equal(ozet.sozlesmeTahsilati, 2000);
  assert.equal(ozet.aktarim, 8000);
  assert.equal(ozet.iade, 200);
  assert.equal(ozet.buroGelir, tahsilatlar.filter(t => gelirTahsilatiMi(t.tur)).reduce((s,t) => s+t.tutar,0));
  assert.equal(ozet.sozlesmeTahsilati, tahsilatlar.filter(t => ucretTahsilatiMi(t.tur)).reduce((s,t) => s+t.tutar,0));
});

test('only debtor receipts reduce the cover-sheet collection amount', () => {
  const ozet = dosyaParaOzeti({ tahsilatlar: [
    { tur: 'borclu_odeme', tutar: 1000 }, { tur: 'tahsilat', tutar: '250' },
    { tur: 'akdi_vekalet', tutar: 500 }, { tur: 'aktarim', tutar: 800 },
  ] });
  assert.equal(ozet.karsiTaraf, 1250);
});

test('legacy totals apply only when explicit movements are absent', () => {
  assert.equal(dosyaParaOzeti({ tahsil: 500, tahsilatlar: [] }).karsiTaraf, 500);
  assert.equal(dosyaParaOzeti({ tahsilEdildi: 200 }).sozlesmeTahsilati, 200);
  assert.equal(dosyaParaOzeti({ tahsilEdildi: 200, tahsilatlar: [{ tur: 'aktarim', tutar: 50 }] }).sozlesmeTahsilati, 0);
});

test('invalid legacy amounts and fractional movements cannot poison totals', () => {
  const record = { tahsilatlar: [null, { tur: 'akdi_vekalet', tutar: 'invalid' },
    { tur: 'akdi_vekalet', tutar: 0.1 }, { tur: 'akdi_vekalet', tutar: 0.2 }] };
  assert.equal(dosyaParaOzeti(record).buroGelir, 0.3);
  assert.equal(dosyaMasrafToplami({ harcamalar: [null, { tutar: '100' }, { tutar: 'bad' }] }), 100);
});

test('explicit agreement totals and fixed fees preserve legacy precedence', () => {
  assert.equal(anlasilanUcret({ anlasma: { toplam: 5000, tur: 'pesin', ucret: 3000 }, ucret: 1000 }), 5000);
  assert.equal(anlasilanUcret({ anlasma: { tur: 'taksit', ucret: '3000' } }), 3000);
  assert.equal(anlasilanUcret({ anlasma: {}, ucret: 1000 }), 1000);
});

test('percentage and mixed agreements match the established server formulas', () => {
  assert.equal(anlasilanUcret({ alacak: 100000, anlasma: { tur: 'tahsilat', yuzde: 10 } }), 10000);
  assert.equal(anlasilanUcret({ deger: 50000, anlasma: { tur: 'basari', baz: 20000, yuzde: 15 } }), 3000);
  assert.equal(anlasilanUcret({ alacak: 100000, anlasma: { tur: 'karma', karmaP: 2000, karmaYuzde: 10 } }), 12000);
  assert.equal(anlasilanUcret({ alacak: 100000, anlasma: { tur: 'basari', baz: 0, yuzde: 10 } }), 0);
});
