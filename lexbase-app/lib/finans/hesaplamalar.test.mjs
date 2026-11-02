import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bruttenNete, nettenBrute, safeNum, tahsilatToplam } from '../utils/finans.ts';

test('net input and saved gross agree when VAT and withholding differ', () => {
  const saved = nettenBrute(960, 20, 0);
  assert.equal(saved.brutTutar, 800);
  assert.equal(bruttenNete(saved.brutTutar, 20, 0).netTutar, 960);
  const withheld = nettenBrute(900, 10, 20);
  assert.equal(withheld.brutTutar, 1000);
  assert.equal(bruttenNete(withheld.brutTutar, 10, 20).netTutar, 900);
});

test('invalid legacy amounts cannot poison financial totals', () => {
  assert.equal(safeNum('invalid'), 0);
  assert.equal(safeNum(Infinity), 0);
  assert.equal(tahsilatToplam([{ tutar: 0.1 }, { tutar: 0.2 }, { tutar: NaN }]), 0.3);
  assert.equal(tahsilatToplam(null), 0);
});
