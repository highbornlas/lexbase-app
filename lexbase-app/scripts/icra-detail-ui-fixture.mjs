import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  entryPoints: [resolve(root, 'tests/ui/icraDetailFixtureEntry.tsx')], bundle: true, write: false,
  format: 'esm', splitting: true, outdir: '/virtual', platform: 'browser', jsx: 'automatic', tsconfig: resolve(root, 'tsconfig.json'),
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [{ name: 'synthetic-only', setup(build) {
    build.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'fixture' }));
    build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default function Link({href,children,...props}) {return <a href={href} {...props}>{children}</a>}', loader: 'jsx', resolveDir: root }));
    build.onResolve({ filter: /\/useOzelKalemTurleri$/ }, () => ({ path: 'hooks', namespace: 'synthetic-hooks' }));
    build.onLoad({ filter: /.*/, namespace: 'synthetic-hooks' }, () => ({ contents: 'export const useOzelKalemTurleri=()=>({data:[]});export const useOzelKalemTuruKaydet=()=>({mutateAsync:async()=>{},isPending:false});', loader: 'js' }));
  } }],
});
const files = new Map(result.outputFiles.map(file => [file.path.replace('/virtual', ''), file.text]));
const css = 'body{margin:0;background:#15171c;color:#eee;font:15px Georgia}main{max-width:1150px;margin:auto;padding:24px}button,input,select,textarea{font:inherit;padding:8px;margin:4px;background:#252932;color:#eee;border:1px solid #777;border-radius:6px}button:disabled{opacity:.4}h1{color:#d1af62}nav{display:flex;flex-wrap:wrap}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #555}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.flex{display:flex;gap:12px;flex-wrap:wrap}label{display:block}pre{white-space:pre-wrap}';
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (files.has(req.url)) { res.setHeader('Content-Type', 'text/javascript'); res.end(files.get(req.url)); return; }
  if (req.url !== '/') { res.statusCode = 404; res.end('Not found'); return; }
  res.setHeader('Content-Type', 'text/html');
  res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><title>LexBase icra pilot fixture</title><style>${css}</style><div id="root"></div><script type="module" src="/icraDetailFixtureEntry.js"></script>`);
});
server.listen(3919, '127.0.0.1', () => console.log('Synthetic icra components only: http://127.0.0.1:3919'));
process.on('SIGINT', () => server.close(() => process.exit(0)));
