// filldump.ts SEED WOOD RECRUITS SPACING DEPTH : forestParams(160) with the A4 candidate's knobs
const [seed, wood, recruits, spacing, depth] = process.argv.slice(2).map(Number);
const { forestParams } = await import("/home/edbarker/Documents/Projects/tree-simulation/src/core/presets.ts");
const p = forestParams(160, seed, { recruits, spacing });
if (depth > 0) {
  p.world.depth = depth;
  for (const t of p.trees) t.z = depth / 2;
  p.o4.band = depth;
}
if (wood > 0) p.world.faceWood = wood;
if (process.env.M0ZERO) { p.o4.m0 = 0; for (const sp of Object.values(p.species ?? {}) as any[]) if (sp.o4) sp.o4.m0 = 0; }
if (process.env.ALLSP) for (const t of p.trees) t.species = process.env.ALLSP;
if (process.env.O4OFF) p.o4.enabled = false;
if (process.env.NOSTORM) p.o2.stormP = 0;
if (process.env.LAYERED) {
  // A6b: a canopy row of canopy species at the given spacing, an understorey half a depth away in every other gap.
  const CANOPY = (process.env.CANOPYSET ?? "beech,oak,hornbeam,birch").split(","), UNDER = ["holly", "maple", "rowan", "willow"];
  const W = p.world.width, Dz = p.world.depth, n = Math.max(2, Math.round(W / spacing)), sp = W / n;
  const trees: any[] = [];
  for (let k = 0; k < n; k++) trees.push({ species: CANOPY[(k + seed) % CANOPY.length], x: (k + 0.5) * sp, z: Dz / 2 });
  for (let k = 0; k < n; k += 2) trees.push({ species: UNDER[(k / 2 + seed) % 4], x: (k + 1) * sp, z: 0.5 });
  p.trees = trees;
}
if (process.env.SPPATCH) {
  // {"species": {"dotted.path": value}}
  for (const [sp, kv] of Object.entries(JSON.parse(process.env.SPPATCH))) for (const [path, v] of Object.entries(kv as any)) {
    const keys = path.split("."); let cur: any = (p.species as any)[sp];
    for (const k of keys.slice(0, -1)) cur = cur[Array.isArray(cur) ? Number(k) : k] ??= {};
    cur[keys.at(-1) as string] = v;
  }
}
if (process.env.SIDESZ) p.world.sidesZ = process.env.SIDESZ;
if (process.env.FACES) p.world.faces = [Number(process.env.FACES), Number(process.env.FACES)];
process.stdout.write(JSON.stringify(p));
