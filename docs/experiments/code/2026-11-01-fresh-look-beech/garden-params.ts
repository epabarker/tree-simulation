// The garden's worlds as params JSON, for native runs (review of the fresh-look beech, 2026-11-01):
// forestParams(width, seed), the garden's own planting, at the phone's plate (54 cells, 2 trees) and
// the laptop's (146 cells, 5 trees), and the lab's mixedWood preset.
//   node docs/experiments/code/2026-11-01-fresh-look-beech/garden-params.ts <out-dir> <kind> <width> <seeds,…>
// kind: "garden" (forestParams) or "mixedWood" (presetParams).
import { mkdirSync, writeFileSync } from "node:fs";
import { forestParams, presetParams } from "../../../../src/core/presets.ts";

const [out = "runs/fresh-look/garden", kind = "garden", width = "54", seeds = "2,3"] =
  process.argv.slice(2);
mkdirSync(out, { recursive: true });
for (const s of seeds.split(",").map(Number)) {
  const p = kind === "garden" ? forestParams(Number(width), s) : presetParams("mixedWood", s);
  const name = `${kind}-${kind === "garden" ? `w${width}-` : ""}s${s}.json`;
  writeFileSync(`${out}/${name}`, JSON.stringify(p));
  const species = p.trees.map((t) => `${t.species}@${Math.round(t.x)}`).join(" ");
  console.log(name, p.world.width, species);
}
