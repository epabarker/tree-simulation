/** Registered A6b only; this factory does not alter the shipping garden. */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { forestParams } from "../../src/core/presets.ts";
import { loneParams } from "../../cli/trials.ts";
export const CONDITIONS = ["base", "depth-m10", "depth-p10", "kExt-m10", "kExt-p10", "eS-m10", "eS-p10", "dLambda-m10", "dLambda-p10"];
export function layeredParams(width: number, seed: number, condition = "base") {
  if (!CONDITIONS.includes(condition)) throw new Error("unregistered condition");
  const p = forestParams(width, seed, { spacing: 21 });
  // Step 8 is frozen: pin the stand it recorded (before #121's flip), not today's garden. No
  // planting (it would replace the trees below), size-blind mortality, the old cap
  // (300 per 210 cells of width × 0.25 recruits) and holly outside O4.
  delete p.o4.planting;
  p.o4.mortality = "sizeBlind";
  p.o4.maxTrees = Math.max(20, Math.round(((300 * p.world.width) / 210) * 0.25));
  p.species.holly = { ...p.species.holly, o4: { ...p.species.holly?.o4, enabled: false } };
  const W = p.world.width, n = Math.max(2, Math.round(W / 21)), spacing = W / n;
  const canopy = ["beech", "oak", "hornbeam", "birch"], under = ["holly", "maple", "rowan", "willow"];
  p.world.depth = 24; p.world.sidesZ = "periodic"; p.o4.band = 24;
  p.trees = Array.from({length:n},(_,k)=>({species:canopy[(k+seed)%4],x:(k+.5)*spacing,z:12}));
  for(let k=0;k<n;k+=2)p.trees.push({species:under[(k/2+seed)%4],x:(k+1)*spacing,z:.5});
  if(condition!=="base") {
    const [key,step]=condition.split("-"),factor=step==="m10"?.9:1.1;
    if(key==="depth")p.world.depth*=factor;
    if(key==="kExt")p.c2.kExt*=factor;
    if(key==="eS")p.r5.eS*=factor;
    if(key==="dLambda")p.r5.dLambda*=factor;
  }
  return p;
}
if(process.argv[2]==="prepare") {
  const out=resolve(process.argv[3]);mkdirSync(out,{recursive:true});
  const species=["beech","hornbeam","birch","oak","holly","maple","rowan","willow"];
  const lone=[];const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
  for(let seed=1;seed<=20;seed++) {
    for(const sp of species) {
      const before=JSON.stringify(loneParams(sp,seed));
      for(const condition of CONDITIONS)layeredParams(160,seed,condition);
      layeredParams(66,seed);
      const after=JSON.stringify(loneParams(sp,seed));
      if(before!==after)throw new Error("garden factory changed lone params");
      lone.push({species:sp,seed,before_sha256:hash(before),after_sha256:hash(after)});
    }
    for(const condition of [...CONDITIONS,"current"]) {
      const dir=resolve(out,condition,`s${seed}`);mkdirSync(dir,{recursive:true});
      const p=condition==="current"?forestParams(160,seed):layeredParams(160,seed,condition);
      writeFileSync(resolve(dir,"params.json"),JSON.stringify(p)+"\n");
    }
  }
  writeFileSync(resolve(out,"lone-input-identity.json"),JSON.stringify({N:lone.length,records:lone},null,2)+"\n");
}
