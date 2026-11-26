import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['BakiyelerTab', 'GelirlerTab', 'BuroGiderleriTab', 'KarZararTab', 'KarlilikTab', 'BeklenenGelirTab', 'UyarilarTab', 'AvansKasaTab'];
const widgets = ['PerformansWidget', 'MuvekkilBakiyeWidget', 'FinansUyariWidget', 'BeklenenGelirWidget'];
const source = [...names.map(name => `export { ${name} } from './components/modules/finans/${name}';`),
  ...widgets.map(name => `export { ${name} } from './components/dashboard/widgets/${name}';`)].join('\n');
const hooks = `
const query = () => ({data: undefined, gelirler: [], veriler: {}, ...globalThis.__financeState});
export const useMuvekkillar=query, useFinansRaporVerisi=query, useGelirVerisi=query, useBuroGiderleri=query;
export const useDashboardFinans=query;
export const useBuroKarZarar=query, useDosyaKarlilik=query, useBeklenenGelir=query, useFinansUyarilar=query, useTumAvansHareketleri=query;
export const useBuroGiderSil=()=>({isPending:false,mutateAsync:async()=>{}}), useBuroGiderKaydet=useBuroGiderSil;
export const useBuroId=()=>null;
export const useModalDraft=()=>({isDirty:false,hasDraft:()=>false});
export const GELIR_KAYNAKLARI=[], GIDER_KATEGORILERI=[], KDV_ORANLARI=[], AVANS_ESIK=500;
export const hesaplaTumKasalar=()=>new Map();
`;
const bundled = await build({
  stdin: { contents: source, loader: 'tsx', resolveDir: root }, bundle: true, write: false,
  platform: 'node', format: 'cjs', jsx: 'automatic', tsconfig: `${root}tsconfig.json`,
  external: ['react', 'react/jsx-runtime'],
  plugins: [{ name: 'finance-query-errors', setup(build) {
    build.onResolve({ filter: /^@\/lib\/hooks\// }, () => ({ path: 'hooks', namespace: 'test' }));
    build.onLoad({ filter: /^hooks$/, namespace: 'test' }, () => ({ contents: hooks, loader: 'js' }));
    build.onResolve({ filter: /^next\/dynamic$/ }, () => ({ path: 'dynamic', namespace: 'test' }));
    build.onLoad({ filter: /^dynamic$/, namespace: 'test' }, () => ({ contents: 'export default ()=>()=>null', loader: 'js' }));
    build.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'test' }));
    build.onLoad({ filter: /^link$/, namespace: 'test' }, () => ({ contents: 'export default ({children})=>children', loader: 'js' }));
  } }],
});
const module = { exports: {} };
const status = { isError: true, isLoading: false, isPending: false };
runInNewContext(bundled.outputFiles[0].text, { module, exports: module.exports, __financeState: status,
  require: createRequire(new URL('../package.json', import.meta.url)), console }, { timeout: 10000 });

for (const name of [...names, ...widgets]) test(`${name}: failed query renders an alert, not a false zero or healthy state`, () => {
  Object.assign(status, { isError: true, isLoading: false, isPending: false });
  const html = renderToStaticMarkup(React.createElement(module.exports[name], { yil: 2026, ay: 11, setYil() {}, setAy() {} }));
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /Tüm finansal göstergeler normal|TOPLAM|Toplam Brüt Gelir|Net Ödenen/);
});

for (const name of [...names, ...widgets]) test(`${name}: pending query cannot display completed totals or a healthy state`, () => {
  Object.assign(status, { isError: false, isLoading: true, isPending: true });
  const html = renderToStaticMarkup(React.createElement(module.exports[name], { yil: 2026, ay: 11, setYil() {}, setAy() {} }));
  assert.doesNotMatch(html, /Tüm finansal göstergeler normal|TOPLAM|Toplam Brüt Gelir|Net Ödenen|Finansal uyarı bulunmuyor/);
});

test('finance entry defers sections and cash exports, and office expense modal stays unmounted until opened', () => {
  const finans = readFileSync(new URL('../app/(app)/finans/page.tsx', import.meta.url), 'utf8');
  assert.match(finans, /aktifTab === 'bakiye'/);
  assert.match(finans, /dynamic\(/);
  const gider = readFileSync(new URL('../components/modules/finans/BuroGiderleriTab.tsx', import.meta.url), 'utf8');
  assert.match(gider, /modalAcik && <BuroGiderModal/);
  for (const file of ['finans/AvansKasaTab.tsx', 'muvekkil/MuvMasrafAvansKasa.tsx']) {
    const text = readFileSync(new URL(`../components/modules/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(text, /^import .*from '@\/lib\/export\//m);
    assert.match(text, /await import\('@\/lib\/export\/pdfExport'\)/);
  }
});
