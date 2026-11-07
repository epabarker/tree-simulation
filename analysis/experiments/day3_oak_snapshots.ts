/** Rendering-only repeats of step5's registered first4 seeds, with hash witnesses. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loneParams, newWorld, setPath } from "../../cli/trials.ts";
const [condition, seedText, out] = process.argv.slice(2);
if (!["current", "n3"].includes(condition) || ![10001,10002,10003,10004].includes(Number(seedText))) throw new Error("unregistered sheet input");
const p = loneParams("oak", Number(seedText));
if (condition === "n3") for (const [k,v] of Object.entries(JSON.parse(readFileSync(new URL("day3_oak_n3.patch.json",import.meta.url),"utf8")).oak)) setPath(p.species!.oak,k,v as number);
const w = newWorld(p); mkdirSync(out,{recursive:true});
for (const season of [100,150]) {
  w.run(season-w.season);
  const snapshot = w.snapshot(0);
  const head: Record<string,unknown> = {}, parts: Uint8Array[] = []; let off = 0;
  for (const [k,v] of Object.entries(snapshot)) {
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
      const a = v as any, pad = (8-off%8)%8;
      if (pad) { parts.push(new Uint8Array(pad));off+=pad; }
      head[k]={t:a.constructor.name,off,len:a.length}; parts.push(new Uint8Array(a.buffer,a.byteOffset,a.byteLength).slice()); off+=a.byteLength;
    } else head[k]={v};
  }
  const bin=new Uint8Array(off);let at=0;for(const part of parts){bin.set(part,at);at+=part.length;}
  const name=`${out}/${condition}-${seedText}-${season}`;
  writeFileSync(`${name}.json`,JSON.stringify(head));writeFileSync(`${name}.bin`,bin);
}
writeFileSync(`${out}/${condition}-${seedText}.hash`,w.hash());w.dispose();
