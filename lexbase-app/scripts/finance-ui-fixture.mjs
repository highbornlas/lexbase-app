import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  entryPoints: [resolve(root, 'tests/ui/financeFixtureEntry.tsx')], bundle: true, write: false,
  format: 'esm', outdir: '/virtual', platform: 'browser', jsx: 'automatic', tsconfig: resolve(root, 'tsconfig.json'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'synthetic-finance-only', setup(build) {
    build.onResolve({ filter: /\/use(BuroGiderleri|Buro)$/ }, () => ({ path: resolve(root, 'tests/ui/financeFixtureHooks.ts') }));
  } }],
});
const files = new Map(result.outputFiles.map(file => [file.path.replace('/virtual', ''), file.text]));
const css = 'body{margin:0;background:#171b20;color:#eee;font:16px Georgia}main{max-width:1050px;margin:auto;padding:24px}button,input,select,textarea{font:inherit;padding:8px;margin:5px;background:#252b33;color:#eee;border:1px solid #777;border-radius:5px}button:disabled,fieldset:disabled{opacity:.5}h1{color:#d1af62}label{display:block}pre{white-space:pre-wrap}.fixed{position:fixed;inset:0;background:#171b20;overflow:auto;padding:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.flex{display:flex;gap:10px;flex-wrap:wrap}fieldset{border:0}[role=alert]{color:#ff8c8c}';
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (files.has(req.url)) { res.setHeader('Content-Type', 'text/javascript'); res.end(files.get(req.url)); return; }
  if (req.url !== '/') { res.statusCode = 404; res.end('Not found'); return; }
  res.setHeader('Content-Type', 'text/html');
  res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><title>LexBase finance fixture</title><style>${css}</style><div id="root"></div><script type="module" src="/financeFixtureEntry.js"></script>`);
});
server.listen(3920, '127.0.0.1', () => console.log('Synthetic finance forms only: http://127.0.0.1:3920'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
