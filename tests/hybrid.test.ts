/**
 * I1 (ADR 0024): the 2D core ported to Rust phase by phase. `LANDED` lists the phases that run
 * in Rust so far, in season order; each landing adds one.
 *
 * - **Goldens, hybrid:** every golden with the landed phases in Rust and the rest in TypeScript,
 *   unchanged bit for bit.
 * - **Side by side:** on runs that between them switch on every principle, preset and event
 *   kind, each landed phase also runs in Rust from the TypeScript state before it, and the two
 *   results must agree bit for bit (tables, scalars, the scratch later phases read, the world's
 *   flags, owner grid and light field).
 */
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashWorld } from "../src/core/hash.ts";
import { mergeParams, type Params, type ParamsPatch } from "../src/core/params.ts";
import { type PresetName, presetParams } from "../src/core/presets.ts";
import type { Phase } from "../src/core/season.ts";
import { type RunEvent, World } from "../src/core/world.ts";
import { type Mismatch, useHybrid, useSideBySide } from "../src/wasm/hybrid.ts";
import { caseKey, GOLDEN_CASES, runCase } from "./golden-cases.ts";
import { loadRustCore } from "./wasm.ts";

/** The phases ported so far, in season order (`I1_PHASES=a,b` runs another set). */
const LANDED = (process.env.I1_PHASES?.split(",") ?? [
  "light",
  "sample",
  "allocate",
  "grow",
  "shed",
]) as Phase[];

const golden = JSON.parse(
  readFileSync(new URL("./golden.json", import.meta.url), "utf8"),
) as Record<string, string>;

describe(`goldens with ${LANDED.join(", ")} in Rust (I1, hybrid)`, () => {
  beforeAll(() => {
    loadRustCore();
    useHybrid(LANDED);
  });
  afterAll(() => useHybrid(null));
  for (const c of GOLDEN_CASES) {
    it(caseKey(c), () => {
      expect(runCase(c)).toBe(golden[caseKey(c)]);
    });
  }
});

interface Run {
  name: string;
  params: Params;
  seasons: number;
  events?: RunEvent[];
}

const run = (
  preset: PresetName,
  seasons: number,
  patch: ParamsPatch = {},
  events?: RunEvent[],
): Run => ({
  name: `${preset}${Object.keys(patch).length ? `+${Object.keys(patch).join("+")}` : ""}`,
  params: mergeParams(presetParams(preset), patch),
  seasons,
  ...(events ? { events } : {}),
});

/** Between them: every light model, every C3 mode, every principle, species, obstacles, events. */
const SIDE_BY_SIDE: Run[] = [
  run("explosion", 12),
  run("shadow", 30),
  run("wall", 25),
  run("pruned", 30),
  run("pair", 30),
  run("skyStand", 30),
  run("skyLate", 30),
  run("obliqueSun", 25),
  run("skyStand", 25, { c2: { ...presetParams("skyStand").c2, model: "pooled" } }),
  run("skyStand", 25, { c3: { ...presetParams("skyStand").c3, mode: "equal" } }),
  run("skyTree", 30, {
    world: {
      ...presetParams("skyTree").world,
      obstacles: [{ x: 70, y: 30, width: 30, height: 8 }],
    },
  }),
  run("forest", 60),
  run("forest", 40, {
    o2: { ...presetParams("forest").o2, enabled: true, stormP: 0.3 },
    r3: { ...presetParams("forest").r3, sigmaBreak: 2500 },
  }),
  run("thinning", 30),
  run("clearing", 50),
  run("mixedWood", 60),
  run("oakOpen", 45),
  run("firWood", 40),
  run("succession", 30, {}, [
    { season: 5, type: "plantTree", x: 33 },
    { season: 9, type: "removeTree", tree: 2 },
    { season: 12, type: "params", patch: { c3: { ...presetParams("succession").c3, alpha: 2.5 } } },
  ]),
];

describe(`side by side: ${LANDED.join(", ")} in TypeScript and in Rust (I1)`, () => {
  const found: Mismatch[] = [];
  beforeAll(() => {
    loadRustCore();
    useSideBySide((m) => found.push(m), LANDED);
  });
  afterAll(() => useSideBySide(null));
  for (const r of SIDE_BY_SIDE) {
    it(r.name, () => {
      found.length = 0;
      const world = new World(r.params);
      world.run(r.seasons, r.events ?? []);
      expect(found.slice(0, 3)).toEqual([]);
      expect(hashWorld(world)).toMatch(/^[0-9a-f]{8}$/);
    });
  }
});
