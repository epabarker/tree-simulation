/**
 * #133's dose calibration (the user, 2026-11-15: "a calibrated dose ladder"). ADR 0067 decision 5
 * fixes the wind load's form but not its size k_w (`r3.windLoad`). This measures, on HEAD's lone
 * tree, the ratio M_w / |M_g| at the trunk's base for k_w = 1, separately for leaf-only drag
 * (`r3.windStem` 0) and leaf plus stem (`r3.windStem` 1). M_w is linear in k_w, so the probe's
 * ladder (M_w = 0.5×, 1× and 2× gravity's moment at the base) is k_w = {0.5, 1, 2} / ratio.
 *
 * Method: grow the lone tree to season `at − 1` with the wind off, save it, and run season `at`
 * twice from the save, once off and once with a small k_w (`--kw`, two values to check linearity), both with `r3.girthGain` 0 so that the base's
 * radius is the same in both runs. Then σ ∝ (|M_g| + M_w)/r³ gives
 * M_w / |M_g| = stress_on / stress_off − 1 at the root metamer, divided by k_w. The two runs differ in nothing else
 * unless the extra stress breaks a limb (at k_w 1 it breaks most of the crown, and the ratio is
 * then wrong), so the extra broken count is printed beside the ratio and must be 0.
 * WASM (npm run build:wasm), as the probe's checkpoint gate.
 *
 *   node cli/wind-calibrate.ts [--species hornbeam,beech] [--seeds 1] [--at 60]
 */
import { readFileSync } from "node:fs";
import type { Params } from "../src/core/params.ts";
import { loneTreeParams } from "../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";
import { arg, type Patch, patched } from "./shared.ts";

const species = arg("--species", "hornbeam,beech").split(",");
const seeds = arg("--seeds", "1").split(",").map(Number);
const at = Number(arg("--at", "60"));
/** The k_w each ratio is measured at: small enough that the extra stress breaks nothing. */
const kws = arg("--kw", "0.001,0.004").split(",").map(Number);

loadWorldsSync(readFileSync(coreWasm));

/** The r3 patch on the world and on every species, since species carry their own r3. */
const r3Patch = (base: Params, r3: Record<string, number>): Patch => ({
  params: { r3 },
  species: Object.fromEntries(Object.keys(base.species ?? {}).map((s) => [s, { r3 }])),
});

const rows: string[] = [];
for (const sp of species) {
  for (const seed of seeds) {
    const base = loneTreeParams(sp, seed);
    const w0 = RustWorld.create(base);
    w0.run(at - 1);
    const bytes = w0.save();
    w0.dispose();
    const once = (r3: Record<string, number>) => {
      const w = RustWorld.load(new Uint8Array(bytes));
      const next = patched(w.params, r3Patch(w.params, r3));
      w.setParams({ r3: next.r3, species: next.species });
      w.step(1, false);
      const t = w.trees.find((x) => x.alive && x.species === sp);
      if (!t) throw new Error(`${sp} s${seed}: no live tree at season ${at}`);
      const r = { stress: t.stress[0] as number, broken: t.broken, season: w.season };
      w.dispose();
      return r;
    };
    const off = once({ girthGain: 0, windLoad: 0 });
    for (const [label, windStem] of [
      ["leaf", 0],
      ["leaf+stem", 1],
    ] as const) {
      for (const kw of kws) {
        const on = once({ girthGain: 0, windLoad: kw, windStem });
        // M_w is linear in k_w: the ratio per unit k_w.
        const ratio = (on.stress / off.stress - 1) / kw;
        rows.push(
          [
            sp,
            seed,
            label,
            kw,
            off.season,
            off.stress.toPrecision(4),
            on.stress.toPrecision(4),
            ratio.toPrecision(4),
            on.broken - off.broken,
          ].join("\t"),
        );
      }
    }
  }
}
console.log(
  "species\tseed\tdrag\tk_w\tseason\tstress_off\tstress_on\tMw/Mg per unit k_w\textra broken",
);
for (const r of rows) console.log(r);
