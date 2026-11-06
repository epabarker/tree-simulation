// Species step 1: the light under each roof density of the 3D shade house (cli/trials.ts's
// shadeParams), on the ground under the seedling in its first season, for ROOFS.
//   node docs/experiments/code/2026-10-30-species-3d/roofs.ts beech 0.25,0.5,1,2,3.3,5,8
import { newWorld, shadeParams } from "../../../../cli/trials.ts";

const sp = process.argv[2] ?? "beech";
const roofs = (process.argv[3] ?? "0.25,0.5,1,2,3.3,5,8").split(",").map(Number);
for (const roof of roofs) {
  const lights = [1, 2, 3].map((seed) => {
    const w = newWorld(shadeParams(sp, seed, roof));
    w.step();
    const q = w.groundLight(0, 6);
    w.dispose();
    return q;
  });
  console.log(`${roof}\t${lights.map((q) => (100 * q).toFixed(2)).join("\t")}`);
}
