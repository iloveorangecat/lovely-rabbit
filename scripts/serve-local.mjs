import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=5173;
if(!existsSync(path.join(root,'index.html'))){console.error('Missing dist/index.html. Run npm run build first.');process.exit(1);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 if(pathname==='/__health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({app:'beauty-quest',status:'ok'}));return;}
 const requested=path.resolve(root,'.'+pathname);const relative=path.relative(root,requested);
 if(relative.startsWith('..')||path.isAbsolute(relative)||pathname.includes('\0')){res.writeHead(403);res.end();return;}
 let file=requested;
 try{if(statSync(file).isDirectory())file=path.join(file,'index.html');}catch{if(path.extname(file)){res.writeHead(404);res.end();return;}file=path.join(root,'index.html');}
 try{const info=statSync(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':info.size,'Cache-Control':file.includes(path.sep+'assets'+path.sep)?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD'){res.end();return;}createReadStream(file).on('error',()=>res.destroy()).pipe(res);}catch{res.writeHead(404);res.end();}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 5173 is already in use. Open http://localhost:5173/ or stop the previous server.':error);process.exit(1);});
server.listen(port,'127.0.0.1',()=>{console.log('\nLovely Rabbit production preview is running.\nOpen http://localhost:5173/\nKeep this process/window open. Press Ctrl+C to stop.\n');});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));

