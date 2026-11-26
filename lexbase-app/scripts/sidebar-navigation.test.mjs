import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const state = { rol: 'sahip', loading: false, error: null };
const hooks = `
const query=()=>({data:[]});
export const useMuvekkillar=query,useDavalar=query,useIcralar=query,useDanismanliklar=query;
export const useTodolar=query,useFinansUyarilar=query,useIhtarnameler=query;
export const useOnayBekleyenSayisi=()=>0;
export const useRol=()=>({...globalThis.__role,yenile(){}});
export const yetkiVar=()=>true;
`;
const bundled = await build({
  entryPoints: [`${root}components/layout/Sidebar.tsx`], bundle: true, write: false,
  platform: 'node', format: 'cjs', jsx: 'automatic', tsconfig: `${root}tsconfig.json`,
  external: ['react', 'react/jsx-runtime'],
  plugins: [{ name: 'sidebar-fixture', setup(build) {
    build.onResolve({ filter: /^@\/lib\/hooks\// }, () => ({ path: 'hooks', namespace: 'test' }));
    build.onLoad({ filter: /^hooks$/, namespace: 'test' }, () => ({ contents: hooks }));
    build.onResolve({ filter: /^\.\/BuroSecici$/ }, () => ({ path: 'bureau', namespace: 'test' }));
    build.onLoad({ filter: /^bureau$/, namespace: 'test' }, () => ({ contents: 'export const BuroSecici=()=>null;' }));
    build.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'test' }));
    build.onLoad({ filter: /^navigation$/, namespace: 'test' }, () => ({ contents: 'export const usePathname=()=>"/dashboard";' }));
  } }],
});
const module = { exports: {} };
runInNewContext(bundled.outputFiles[0].text, { module, exports: module.exports, __role: state,
  require: createRequire(new URL('../package.json', import.meta.url)), console });
const render = () => renderToStaticMarkup(React.createElement(module.exports.Sidebar, { open: false, onClose() {} }));

test('protected module links have real document destinations independent of the client router', () => {
  state.rol = 'sahip'; state.loading = false; state.error = null;
  const html = render();
  for (const route of ['dashboard','muvekkillar','davalar','icra','arabuluculuk','danismanlik','ihtarname',
    'gorevler','finans','onaylar','takvim','personel','arac-kutusu','ayarlar','destek']) {
    assert.match(html, new RegExp(`<a[^>]*href="/${route}"`));
    assert.ok(existsSync(`${root}app/(app)/${route}/page.tsx`), `Missing module: ${route}`);
  }
  const source = readFileSync(`${root}components/layout/Sidebar.tsx`, 'utf8');
  assert.doesNotMatch(source, /next\/link|preventDefault|router\.push/);
});

test('loading and failed role lookups cannot expose protected module links', () => {
  state.rol = null;
  for (const loading of [true, false]) {
    state.loading = loading; state.error = loading ? null : 'Retry';
    const html = render();
    assert.doesNotMatch(html, /href="\/(finans|davalar|muvekkillar|personel)"/);
    assert.match(html, loading ? /role="status"/ : /role="alert"/);
  }
});
