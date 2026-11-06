// Track 3 planning: the fit's trials on the 3D core, timed, for one species per process.
// Prints the trial worlds' depth and top, each trial's seconds and metamers, and the traits.
import { loneParams, runLone, runRelease, runShade, runStand, standParams } from "../../../../cli/trials.ts";

const sp = process.argv[2] ?? "beech";
const seed = Number(process.argv[3] ?? 1);
const lp = loneParams(sp, seed);
const sq = standParams(sp, seed);
const out: Record<string, unknown> = {
  species: sp,
  seed,
  loneWorld: { w: lp.world.width, h: lp.world.height, d: lp.world.depth, faces: lp.world.faces },
  standWorld: { w: sq.world.width, h: sq.world.height, d: sq.world.depth, trees: sq.trees.length, z: sq.trees.map((t) => t.z) },
};
let t = performance.now();
const lone = runLone(sp, seed);
out.loneS = +((performance.now() - t) / 1000).toFixed(1);
out.lone = lone;
t = performance.now();
const stand = runStand(sp, seed, {}, true);
out.standS = +((performance.now() - t) / 1000).toFixed(1);
out.stand = stand;
t = performance.now();
const shade = runShade(sp, seed, 3.3);
out.shadeS = +((performance.now() - t) / 1000).toFixed(1);
out.shade = shade;
console.log(JSON.stringify(out));
