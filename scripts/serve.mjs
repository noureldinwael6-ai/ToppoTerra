import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {access, stat, realpath} from 'node:fs/promises';
import {extname, resolve, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const args = new Set(process.argv.slice(2));
const portIndex = process.argv.indexOf('--port');
const requested = portIndex === -1 ? null : process.argv[portIndex + 1];
if (portIndex !== -1 && (!/^\d+$/.test(requested ?? '') || Number(requested) > 65535)) {
  console.error('Invalid --port. Use an integer from 0 through 65535, for example npm start -- --port 4174.');
  process.exit(1);
}
const base = new URL(args.has('--dist') ? '../dist/' : '../', import.meta.url);
let root;
try {
  root = await realpath(fileURLToPath(base));
  await Promise.all(['index.html','app/main.mjs','data/climate.json'].map(file => access(resolve(root,file))));
} catch (error) {
  console.error(args.has('--dist')
    ? 'Production build missing or incomplete. Run npm run build from the ToppoTerra Codex folder, then try npm run preview.'
    : 'Project files missing or unreadable. Keep index.html, app/ and data/ together in the ToppoTerra Codex folder. Missing or unreadable: '+error.path);
  process.exit(1);
}
const mime = {'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const host = '127.0.0.1';
let port = requested === null ? 4173 : Number(requested);
const server = createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) return res.writeHead(405,{Allow:'GET, HEAD'}).end();
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const target = resolve(root,'.'+(path==='/'?'/index.html':path));
    const local = relative(root,target);
    const allowed = ['index.html','data'+sep+'climate.json','data'+sep+'research.json'];
    if (!allowed.includes(local) && !['app','assets'].includes(local.split(sep)[0])) {
      return res.writeHead(404).end('File not found');
    }
    const resolved = await realpath(target);
    if (!resolved.startsWith(root+sep)) return res.writeHead(404).end('File not found');
    const file = await stat(resolved);
    if (!file.isFile()) return res.writeHead(404).end('File not found');
    res.writeHead(200,{'Content-Type':mime[extname(resolved)]??'application/octet-stream','Content-Length':file.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
    if (req.method==='HEAD') res.end();
    else createReadStream(resolved).on('error',()=>res.destroy()).pipe(res);
  } catch {
    res.writeHead(404).end('File not found');
  }
});
server.on('error',error=>{
  if (error.code==='EADDRINUSE' && requested===null && port<4182) {
    port++;
    return server.listen(port,host);
  }
  console.error(error.code==='EADDRINUSE'?'Port in use. Use --port with an available port, or --port 0 to choose one automatically.':error.message);
  process.exitCode=1;
});
server.once('listening',()=>{
  const url='http://'+host+':'+server.address().port+'/';
  console.log('ToppoTerra · '+url);
  if (args.has('--open')) {
    const opener={win32:'explorer.exe',darwin:'open',linux:'xdg-open'}[process.platform];
    if (!opener) return;
    const browser=spawn(opener,[url],{detached:true,stdio:'ignore',windowsHide:true});
    browser.on('error',()=>console.log('Open '+url+' in your browser.'));
    browser.unref();
  }
});
server.listen(port,host);

