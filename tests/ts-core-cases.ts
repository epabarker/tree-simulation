/**
 * The runs whose TypeScript-core results tests/fixtures/ts-core.json records (I1): the Rust world
 * is held to them in tests/rust-world.test.ts now that the TypeScript core is gone.
 */
import { mergeParams, type Params } from "../src/core/params.ts";
import { forestParams, type PresetName, presetParams } from "../src/core/presets.ts";

/** Grown with discardDead each season; fingerprinted every 5 seasons and at the last. */
export const SNAPSHOT_RUNS: [string, Params, number][] = [
  ["skyStand", presetParams("skyStand"), 25],
  ["forest", presetParams("forest"), 40],
  ["mixedWood", forestParams(160, 9), 35],
  ["oakOpen", presetParams("oakOpen"), 30],
  ["shadow", presetParams("shadow"), 25],
];

export const snapshotSeasons = (seasons: number): number[] =>
  Array.from({ length: seasons + 1 }, (_, s) => s).filter((s) => s % 5 === 0 || s === seasons);

/** Run, then c3.alpha + 0.1 and a tree planted at 17.25, then saved; then 10 seasons more. */
export const CHECKPOINT_RUNS: [string, Params, number][] = [
  ["mixed wood", forestParams(220, 12), 30],
  ["succession", presetParams("succession" as PresetName), 25],
  [
    "obstacles",
    mergeParams(presetParams("skyTree"), {
      world: {
        ...presetParams("skyTree").world,
        obstacles: [{ x: 70, y: 30, width: 30, height: 8 }],
      },
    }),
    20,
  ],
];

/** garden-v0.14.0's first-paint checkpoint (66 cells, seed 10), grown 10 seasons. */
export const GARDEN_FIXTURE = "garden-0.14.0-66-10.bin.gz";
