import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileIcraComponents, renderIcraCases } from '../tests/ui/icra-render-harness.mjs';
import { icraClaimFormCases } from '../tests/ui/icra-detail-cases.mjs';

const names = ['OzetTab', 'TebligatlarTab', 'TahsilatTab', 'SurelerTab', 'NotlarTab', 'AnlasmaTab', 'HacizTakibiSection', 'OdemePlaniSection', 'BorcluBilgileriSection'];
const source = names.map(name => `export { ${name} } from '@/components/modules/icra/detay/${name}';`).join('\n');
const observed = renderIcraCases(await compileIcraComponents(source));
const baseline = JSON.parse(readFileSync(new URL('../tests/ui/icra-detail-render-baseline.json', import.meta.url), 'utf8'));

for (const [name, expected] of Object.entries(baseline)) {
  test(`icra extraction preserves rendered markup: ${name}`, () => assert.equal(observed[name], expected));
}

const formBaseline = JSON.parse(readFileSync(new URL('../tests/ui/icra-claim-form-baseline.json', import.meta.url), 'utf8'));
const formObserved = renderIcraCases(await compileIcraComponents("export { AlacakKalemleriAdim } from '@/components/modules/icra/form/AlacakKalemleriAdim';"), icraClaimFormCases());
for (const [name, expected] of Object.entries(formBaseline)) {
  test(`icra claim-form extraction preserves rendered markup: ${name}`, () => assert.equal(formObserved[name], expected));
}

test('icra detail defers inactive heavy components and does not fetch full related lists', () => {
  const page = readFileSync(new URL('../app/(app)/icra/[id]/page.tsx', import.meta.url), 'utf8');
  assert.equal(/\b(?:useDavalar|useMuvekkillar)\s*\(/.test(page), false);
  assert.match(page, /useMuvekkil\(icra\?\.muvId \|\| null\)/);
  assert.match(page, /useDava\(icra\?\.iliskiliDavaId \|\| null\)/);
  for (const name of ['IcraModal', 'TahsilatModal', 'DosyaEvrakTab', 'KapakHesabiPanel']) {
    assert.match(page, new RegExp(`const ${name} = dynamic\\(`));
  }
  assert.match(page, /tahsilatModal && <TahsilatModal/);
});
