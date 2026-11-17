import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';
import { pathToFileURL } from 'node:url';

export function measureClientRoute(root, route = '/(app)/icra/[id]/page') {
  const context = { globalThis: {} };
  const manifestPath = resolve(root, `.next/server/app${route}_client-reference-manifest.js`);
  runInNewContext(readFileSync(manifestPath, 'utf8'), context, { timeout: 1000 });
  const manifest = context.globalThis.__RSC_MANIFEST?.[route];
  const suffix = `/app${route}.tsx`;
  const entries = Object.entries(manifest?.clientModules || {}).filter(([name]) => name.endsWith(suffix));
  if (entries.length !== 1) throw new Error('Expected one page client boundary; run the production webpack build first.');
  const chunks = [...new Set(entries[0][1].chunks.filter((chunk) => chunk.endsWith('.js')))];
  const files = chunks.map((file) => {
    const encoded = resolve(root, '.next', file);
    const content = readFileSync(existsSync(encoded) ? encoded : resolve(root, '.next', decodeURIComponent(file)));
    return { file, bytes: content.length, gzipBytes: gzipSync(content).length };
  });
  return {
    route,
    scope: 'Page client-boundary static chunks; excludes async tabs, framework/layout-only chunks and CSS. Not a browser timing measurement.',
    chunkCount: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    gzipBytes: files.reduce((sum, file) => sum + file.gzipBytes, 0),
    files,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(measureClientRoute(process.cwd(), process.argv[2]), null, 2));
}
