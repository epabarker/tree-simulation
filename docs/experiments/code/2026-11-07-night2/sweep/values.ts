const repo = process.argv[2];
const { loneParams } = await import(`${repo}/cli/trials.ts`);
const PATHS = ["c3.alpha","r1.mf","r1.Lh","r1.maturity","c5.T","r2.aC","r2.dLambda","r2.levels.0.lambda","r2.levels.1.lambda","r2.levels.2.lambda",
  "r2.levels.1.setPoint","r2.levels.1.branchAngle","r2.levels.2.setPoint","c1.shootLengthSD","c1.betaSD","c4.axisSD","c1.budBreak.width"];
const out: Record<string, Record<string, number>> = {};
for (const sp of ["hornbeam","beech","oak","birch","rowan","holly","willow","maple"]) {
  const s: any = loneParams(sp, 1).species[sp]; out[sp] = {};
  for (const p of PATHS) {
    let cur: any = s; for (const k of p.split(".")) cur = cur?.[Array.isArray(cur) ? Number(k) : k];
    if (typeof cur === "number" && cur !== 0) out[sp][p] = cur;
  }
}
console.log(JSON.stringify(out));
