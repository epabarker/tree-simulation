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
process.stdout.write(JSON.stringify(p));
