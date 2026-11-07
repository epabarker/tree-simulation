import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [wt, width, seed] = process.argv.slice(2);
const { forestParams } = await import(pathToFileURL(resolve(wt, "src/core/presets.ts")).href);
// RECRUITS unset: the worktree's own garden planting (0.25 since #50). B0's baselines were run before #50,
// at its own default of 1 (229 live trees at 160 cells); HEAD's night runs set RECRUITS=0.25 (57).
const p = process.env.RECRUITS
  ? forestParams(Number(width), Number(seed), { recruits: Number(process.env.RECRUITS) })
  : forestParams(Number(width), Number(seed));
// A4 candidate: NARROW=<depth> narrows the slab to the recruit band, FACEWOOD=<share> adds the virtual wood.
if (process.env.NARROW) {
  const d = Number(process.env.NARROW);
  p.world.depth = d;
  for (const t of p.trees) t.z = d / 2;
  p.o4.band = d;
}
if (process.env.FACEWOOD) p.world.faceWood = Number(process.env.FACEWOOD);
if (process.env.FACES) p.world.faces = [Number(process.env.FACES), Number(process.env.FACES)];
process.stdout.write(JSON.stringify(p));
