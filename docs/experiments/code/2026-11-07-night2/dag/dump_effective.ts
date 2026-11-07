// node dump_effective.ts <repo> <out.json>: each species' effective params in the lone trial (cli/trials.ts)
const repo = process.argv[2], out = process.argv[3];
const { loneParams, newWorld } = await import(`${repo}/cli/trials.ts`);
const { writeFileSync } = await import("node:fs");
const res: any = {};
for (const sp of ["beech","hornbeam","birch","oak","holly","maple","rowan","willow"]) {
  const w = newWorld(loneParams(sp, 1));
  res[sp] = w.paramsOf(w.trees[0]);
}
writeFileSync(out, JSON.stringify(res, null, 1));
