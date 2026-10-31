// Species round 4, step B.6 (the audit's route A): a line-up panel per species. For each, round 2's
// patch (as adopted, FITTED_FLORA) and a round's fit: the lone trial's tree (cli/trials.ts's
// loneParams, seed 1) at 60 and 100 and the closed stand (standParams, seed 1) at 100, as lab links
// that play to that season and hold the plate (`&bench&seasons=N`), with the traits each shows.
// Generalises 2026-10-30-species-3d/lone-links.ts and lone-traits.ts. Writes <out>/panel.json.
//   node docs/experiments/code/2026-10-31-species-round4/panel-links.ts http://localhost:5173/ round3 <out> [species,…]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  loneParams,
  newWorld,
  STAND_MEASURED,
  standParams,
} from "../../../../cli/trials.ts";
import { FITTED_FLORA } from "../../../../src/core/flora-fitted.ts";
import type { Params } from "../../../../src/core/params.ts";
import { encodePatch } from "../../../../src/web/ui/share.ts";

const [origin = "http://localhost:5173/", round = "round3", out = "runs/panel"] = process.argv.slice(2);
const GARDEN = ["birch", "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple"];
const species = process.argv[5]?.split(",") ?? GARDEN;

/** The trial's world as a patch over oakOpen (what loneParams and standParams change), for a link. */
function link(p: Params, sp: string, patch: unknown, seasons: number): string {
  const enc = encodePatch({
    world: p.world,
    trees: p.trees,
    species: { [sp]: patch },
  } as never);
  return `${origin}?preset=oakOpen&seed=1&p=${enc}&bench&seasons=${seasons}`;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

const panel: Record<string, unknown> = {};
for (const sp of species) {
  const fit = JSON.parse(readFileSync(`docs/experiments/fits/${round}/${sp}.json`, "utf8")).fit;
  const rounds = {
    "round 2": { patch: (FITTED_FLORA as Record<string, unknown>)[sp], assign: undefined },
    [round.replace("round", "round ")]: { patch: fit.patch, assign: fit.assign },
  };
  const entry: Record<string, unknown> = {};
  for (const [name, { patch }] of Object.entries(rounds)) {
    // The patch as the species' whole entry: the lab's links carry it the same way.
    const asPatch = (p: Params): Params => ({ ...p, species: { ...p.species, [sp]: patch as never } });
    const lone = asPatch(loneParams(sp, 1));
    const w = newWorld(lone);
    const traits: Record<string, Record<string, number>> = {};
    for (const season of [60, 100]) {
      w.run(season === 60 ? 60 : 40);
      const t = w.trees[0];
      if (!t) break;
      const m = w.metricsOf(t);
      traits[`lone ${season}`] = {
        height: m.height,
        hd: m.slenderness,
        spread: m.height > 0 ? Math.max(m.crownWidth, m.crownDepth) / m.height : 0,
        widestAt: w.formOf(t).widestAt,
        limbCrownRatio: m.limbCrownRatio,
      };
    }
    w.dispose();
    const stand = asPatch(standParams(sp, 1));
    const s = newWorld(stand);
    s.run(100);
    const ms = STAND_MEASURED.map((k) => s.trees[k])
      .filter((t) => t?.alive)
      .map((t) => s.metricsOf(t as never));
    traits["stand 100"] = {
      height: mean(ms.map((m) => m.height)),
      hd: mean(ms.map((m) => m.slenderness)),
      limbCrownRatio: mean(ms.map((m) => m.limbCrownRatio)),
      leafCrownRatio: mean(ms.map((m) => m.leafCrownRatio)),
      lai: s.lai(0, stand.world.width),
      // The picture's top, for its scale (panel-figure.py): the tallest of all twelve.
      top: Math.max(...s.trees.filter((t) => t.alive).map((t) => s.metricsOf(t).height)),
      floor: s.groundLight(0, stand.world.width),
    };
    s.dispose();
    entry[name] = {
      traits,
      links: {
        "lone 60": link(lone, sp, patch, 60),
        "lone 100": link(lone, sp, patch, 100),
        "stand 100": link(stand, sp, patch, 100),
      },
    };
  }
  panel[sp] = entry;
  console.log(sp, JSON.stringify(Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, (v as { traits: unknown }).traits]))));
}
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/panel.json`, `${JSON.stringify(panel, null, 1)}\n`);
console.log(`wrote ${out}/panel.json`);
