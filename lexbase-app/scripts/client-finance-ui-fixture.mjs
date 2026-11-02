import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({entryPoints:[resolve(root,'tests/ui/clientFinanceFixtureEntry.tsx')],bundle:true,write:false,
  format:'iife',platform:'browser',jsx:'automatic',tsconfig:resolve(root,'tsconfig.json'),
  define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'fixture-navigation',setup(build){
    build.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}));
    build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}',loader:'jsx',resolveDir:root}));
  }}]});
const css='body{margin:0;background:#15171c;color:#eee;font:16px Georgia}main{max-width:1100px;margin:auto;padding:24px}section{margin:20px 0;padding:16px;border:1px solid #666;border-radius:10px}button,input,select{font:inherit;padding:8px;margin:4px;background:#252932;color:#eee;border:1px solid #777;border-radius:6px}button:disabled{opacity:.4}label{display:block}p[role=alert]{color:#ff8585}h1{color:#d1af62}table{width:100%;margin:20px 0;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #555}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px}.flex{display:flex;gap:14px;flex-wrap:wrap}.flex-col{flex-direction:column}';
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(req.url!=='/'){res.statusCode=404;res.end('Not found');return;}
  res.setHeader('Content-Type','text/html');res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><title>LexBase client finance fixture</title><style>${css}</style><div id="root"></div><script src="/bundle.js"></script>`);
});
server.listen(3918,'127.0.0.1',()=>console.log('Synthetic UI only: http://127.0.0.1:3918'));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
