import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { icraDetailCases } from './icra-detail-cases.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../package.json', import.meta.url));
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-11-02T09:00:00Z'])); }
  static now() { return Date.parse('2026-11-02T09:00:00Z'); }
}

export async function compileIcraComponents(source) {
  const result = await build({
    stdin: { contents: source, resolveDir: root, loader: 'tsx' }, bundle: true, write: false,
    format: 'cjs', platform: 'node', jsx: 'automatic', tsconfig: `${root}tsconfig.json`,
    external: ['react', 'react/jsx-runtime'],
    plugins: [{ name: 'test-navigation', setup(build) {
      build.onResolve({ filter: /\/useOzelKalemTurleri$/ }, () => ({ path: 'kalem-hooks', namespace: 'test-kalem' }));
      build.onLoad({ filter: /.*/, namespace: 'test-kalem' }, () => ({ contents: 'export const useOzelKalemTurleri=()=>({data:[]}); export const useOzelKalemTuruKaydet=()=>({mutateAsync:async()=>{},isPending:false});', loader: 'js' }));
      build.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'test' }));
      build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export default function Link({href,children,...props}) {return <a href={href} {...props}>{children}</a>}', loader: 'jsx', resolveDir: root }));
    } }],
  });
  const module = { exports: {} };
  runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, Date: FixedDate, Intl, console }, { timeout: 10000 });
  return module.exports;
}

export function renderIcraCases(components, cases = icraDetailCases()) {
  return Object.fromEntries(cases.map(({ name, component, props }) => {
    const html = renderToStaticMarkup(React.createElement(components[component], props));
    return [name, createHash('sha256').update(html).digest('hex')];
  }));
}
