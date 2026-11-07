/** Actual worker stepping, save/free swap and registered view inputs. */
import { mkdirSync, writeFileSync } from "node:fs";
import { forestParams, specimenParams } from "../../src/core/presets.ts";
import { newWorld } from "../../cli/trials.ts";
import { RustWorld, wasmMemoryBytes } from "../../src/wasm/world.ts";
import { layeredParams } from "./day3_layered_params.ts";
const [mode,condition,seedText,widthText,out]=process.argv.slice(2);
if(!["snapshots","budget","params"].includes(mode)||!["current","base"].includes(condition))throw new Error("bad mode/condition");
const seed=Number(seedText),width=Number(widthText);
if(![160,66].includes(width))throw new Error("unregistered width");
const p=condition==="current"?forestParams(width,seed):layeredParams(width,seed);
if(mode==="params"){writeFileSync(out,JSON.stringify(p)+"\n");process.exit(0);}
const w=newWorld(p);
if(mode==="budget") {
  if(![2,3,9].includes(seed))throw new Error("unregistered budget seed");
  const start=performance.now();
  for(let s=0;s<300;s++){w.step(1,true);w.snapshot(0,{junctions:false,field:false});}
  const gardenMs=performance.now()-start,gardenHash=w.hash(),gardenMetamers=w.trees.reduce((n,t)=>n+t.m.length,0);
  const aside=w.intoCheckpoint(),specimen=newWorld(specimenParams(seed));
  for(let s=0;s<150;s++){specimen.step(1,true);specimen.snapshot(0,{junctions:false,field:false});}
  const specimenHash=specimen.hash(),specimenMetamers=specimen.trees.reduce((n,t)=>n+t.m.length,0);specimen.dispose();
  const restored=RustWorld.load(aside);restored.resetSnapshots();restored.snapshot(0,{junctions:false,field:false});
  if(restored.hash()!==gardenHash)throw new Error("swap restore changed hash");
  writeFileSync(out,JSON.stringify({condition,seed,width,params:p,gardenMs,totalMs:performance.now()-start,memoryMB:wasmMemoryBytes()/1e6,checkpointMB:aside.byteLength/1e6,gardenMetamers,specimenMetamers,gardenHash,specimenHash,restoredHash:restored.hash(),protocol:"worker-save-free-swap-restore"}));restored.dispose();process.exit(0);
}
if(![6,2,3,9,10,12].includes(seed))throw new Error("unregistered view seed");
mkdirSync(out,{recursive:true});const hashes=[];
for(const season of [100,150]) {
  w.step(season-w.season,true);const snapshot=w.snapshot(0);
  const head:Record<string,unknown>={},parts:Uint8Array[]=[];let off=0;
  for(const[k,v]of Object.entries(snapshot)) {
    if(ArrayBuffer.isView(v)&&!(v instanceof DataView)) {
      const a=v as any,pad=(8-off%8)%8;if(pad){parts.push(new Uint8Array(pad));off+=pad;}
      head[k]={t:a.constructor.name,off,len:a.length};parts.push(new Uint8Array(a.buffer,a.byteOffset,a.byteLength).slice());off+=a.byteLength;
    } else head[k]={v};
  }
  const bin=new Uint8Array(off);let at=0;for(const part of parts){bin.set(part,at);at+=part.length;}
  const name=`${out}/${condition}-w${width}-s${seed}-${season}`;
  writeFileSync(name+".json",JSON.stringify(head));writeFileSync(name+".bin",bin);hashes.push({season,hash:w.hash()});
}
writeFileSync(`${out}/${condition}-w${width}-s${seed}.witness.json`,JSON.stringify({params:p,hashes}));w.dispose();
