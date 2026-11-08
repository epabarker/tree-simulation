/** Registered N1 worlds; output only, no simulation. Current candidate is lifespan absent. */
import { writeFileSync } from "node:fs";
import { loneParams } from "../../cli/trials.ts";
import { forestParams } from "../../src/core/presets.ts";

const [context, seedText, condition, out] = process.argv.slice(2);
if (!["lone", "layered"].includes(context) || !["before", "candidate"].includes(condition) || !out)
  throw new Error("expected lone|layered SEED before|candidate OUT");
const seed = Number(seedText);
const p = context === "lone" ? loneParams("beech", seed) : forestParams(160, seed, { recruits: 0.25, spacing: 21 });
if (!p.species?.beech?.r6) throw new Error("missing beech R6");
if (condition === "before") p.species.beech.r6.lifespan = 20;
else delete p.species.beech.r6.lifespan;
if (context === "layered") {
  const canopy = ["beech", "oak", "hornbeam", "birch"];
  const under = ["holly", "maple", "rowan", "willow"];
  const n = Math.max(2, Math.round(p.world.width / 21));
  const spacing = p.world.width / n;
  p.world.depth = 24;
  p.world.sidesZ = "periodic";
  p.o4.band = 24;
  p.trees = Array.from({ length: n }, (_, k) => ({ species: canopy[(k + seed) % 4], x: (k + 0.5) * spacing, z: 12 }));
  for (let k = 0; k < n; k += 2)
    p.trees.push({ species: under[(k / 2 + seed) % 4], x: (k + 1) * spacing, z: 0.5 });
  if (p.trees.filter((t) => t.species === "beech").length !== 2)
    throw new Error("registered layered world needs two planted beech");
}
writeFileSync(out, `${JSON.stringify(p)}\n`);
