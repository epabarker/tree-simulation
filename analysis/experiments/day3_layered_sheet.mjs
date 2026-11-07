/** Render registered garden snapshots with shipping broadleaf style and one periodic lap.
 * node analysis/experiments/day3_layered_sheet.mjs SNAPDIR OUTDIR BROWSER_DEPENDENCY_DIR WIDTH
 * BROWSER_DEPENDENCY_DIR: npm install --prefix runs/day3-step5/browser puppeteer-core
 */
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {rolldown} from '../../node_modules/rolldown/dist/index.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const [snapArg,outArg,depArg,widthArg]=process.argv.slice(2),snap=resolve(snapArg),out=resolve(outArg);
const W=Number(widthArg),PW=W===160?1000:390,PH=W===160?620:640;
if (![160,66].includes(W)) throw new Error("unregistered view width");
mkdirSync(out,{recursive:true});
const puppeteer=createRequire(resolve(depArg,'package.json'))('puppeteer-core');
const pageSource=`import {createRenderer} from ${JSON.stringify(root+'/src/web/render/create.ts')};
import {LEAF_STYLES} from ${JSON.stringify(root+'/src/web/render/leaf-styles.ts')};
let r;window.init=()=>{const c=document.createElement('canvas');c.style.cssText='width:${PW}px;height:${PH}px';document.body.append(c);r=createRenderer(c,'auto');return r.kind;};
window.draw=async(name,scale,leaves)=>{const [head,bin]=await Promise.all([fetch('/snap/'+name+'.json').then(r=>r.json()),fetch('/snap/'+name+'.bin').then(r=>r.arrayBuffer())]);
const ctors={Float32Array,Float64Array,Int32Array,Uint8Array};const s={};for(const[k,v]of Object.entries(head))s[k]='v'in v?v.v:new ctors[v.t](bin,v.off,v.len);
r.setSnapshot(s);const sc=r.scene;sc.clearHistory();sc.frame='world';sc.headroom=0;sc.seasons=false;sc.fit(true);sc.camera.cx=s.width/2;sc.camera.scale=scale;sc.target={cx:s.width/2,scale};sc.pinGround();
r.draw(1,{colorMode:'natural',showLeaves:leaves,leafAge:LEAF_STYLES.broadleaf.leafAge,leafStyle:'broadleaf',showBuds:false,showShadow:false,showGhosts:false});
const c=document.createElement('canvas');c.width=r.canvas.width;c.height=r.canvas.height;c.getContext('2d').drawImage(r.canvas,0,0);return c.toDataURL('image/png');};`;
writeFileSync(resolve(out,'page.ts'),pageSource);
const b=await rolldown({input:resolve(out,'page.ts'),logLevel:'warn'});await b.write({file:resolve(out,'page.js'),format:'iife'});await b.close();
const css=readFileSync(resolve(root,'src/web/render/scene.css'),'utf8');writeFileSync(resolve(out,'index.html'),`<!doctype html><meta charset=utf-8><style>${css}body{margin:0;background:#fff;overflow:hidden}</style><script src=page.js></script>`);
const names=readdirSync(snap).filter(n=>n.endsWith('.bin')&&n.includes('-w'+W+'-')).map(n=>n.slice(0,-4)).sort();
// A shared mature-garden scale per width prevents duplicate laps; tall crowns crop as in the garden.
const scale=PW/W; // One full periodic lap, the mature garden's minimum world zoom.
const server=createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]);const f=u.startsWith('/snap/')?resolve(snap,u.slice(6)):resolve(out,'.'+u);if(!existsSync(f)){res.writeHead(404).end();return;}res.setHeader('content-type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':f.endsWith('.json')?'application/json':'application/octet-stream');res.end(readFileSync(f));}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
const browser=await puppeteer.launch({browser:'firefox',executablePath:'/usr/bin/firefox',headless:true});
try {const page=await browser.newPage();page.on('pageerror',e=>console.error(e));await page.setViewport({width:PW,height:PH,deviceScaleFactor:1});await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);await page.waitForFunction(()=>typeof window.init==='function');console.log('renderer',await page.evaluate(()=>window.init()));
for(const name of names)for(const leaves of [true]){const url=await page.evaluate((n,s,l)=>window.draw(n,s,l),name,scale,leaves);writeFileSync(resolve(out,`${name}-${leaves?'on':'off'}.png`),Buffer.from(url.split(',')[1],'base64'));}
} finally {await browser.close();server.close();}
