/**
 * I1 (ADR 0024): the whole world in the Rust core (src/wasm/world.ts, parity build) against the
 * TypeScript core: every golden; snapshots, array for array and metric for metric; checkpoints
 * both ways, byte for byte, and the worlds grown on from them.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { loadWorld, saveWorld } from "../src/core/checkpoint.ts";
import { fixtureParams, isFixtureName } from "../src/core/fixtures.ts";
import { hashWorld } from "../src/core/hash.ts";
import { mergeParams, type Params } from "../src/core/params.ts";
import { forestParams, type PresetName, presetParams } from "../src/core/presets.ts";
import { FULL_SNAPSHOT, type Snapshot, SnapshotBuilder } from "../src/core/snapshot.ts";
import { World } from "../src/core/world.ts";
import { loadWorldsSync, RustWorld, wasmUrl } from "../src/wasm/world.ts";
import { caseKey, GOLDEN_CASES } from "./golden-cases.ts";

const golden = JSON.parse(
  readFileSync(new URL("./golden.json", import.meta.url), "utf8"),
) as Record<string, string>;

beforeAll(() => loadWorldsSync("parity", readFileSync(wasmUrl.parity)));

describe("goldens in the Rust world (I1, parity build)", () => {
  for (const c of GOLDEN_CASES) {
    it(caseKey(c), () => {
      const params = isFixtureName(c.preset)
        ? fixtureParams(c.preset, c.seed)
        : presetParams(c.preset, c.seed);
      const world = RustWorld.create(params, "parity");
      world.run(c.seasons);
      expect(world.hash()).toBe(golden[caseKey(c)]);
      world.dispose();
    });
  }
});

const ARRAYS = [
  "parent",
  "x0",
  "y0",
  "angle",
  "length",
  "radius",
  "tree",
  "birthId",
  "order",
  "light",
  "resource",
  "age",
  "stress",
  "prevIndex",
  "budMetamer",
  "budState",
  "budQ",
  "junctions",
] as const;

function snapshotDiff(a: Snapshot, b: Snapshot): string | null {
  for (const k of ["season", "width", "height", "periodic", "storm", "metamerCount", "budCount"]) {
    const key = k as keyof Snapshot;
    if (!Object.is(a[key], b[key])) return `${k}: ${a[key]} vs ${b[key]}`;
  }
  for (const k of ARRAYS) {
    const x = a[k] as ArrayLike<number>;
    const y = b[k] as ArrayLike<number>;
    if (x.length !== y.length) return `${k}: length ${x.length} vs ${y.length}`;
    for (let i = 0; i < x.length; i++) {
      if (!Object.is(x[i], y[i])) return `${k}[${i}]: ${x[i]} vs ${y[i]}`;
    }
  }
  const sa = a.shadow ?? [];
  const sb = b.shadow ?? [];
  if (sa.length !== sb.length) return `shadow: length ${sa.length} vs ${sb.length}`;
  for (let i = 0; i < sa.length; i++) if (!Object.is(sa[i], sb[i])) return `shadow[${i}]`;
  if (a.metrics.length !== b.metrics.length) return "metrics: count";
  for (let t = 0; t < a.metrics.length; t++) {
    for (const [k, v] of Object.entries(a.metrics[t] as object)) {
      const w = (b.metrics[t] as unknown as Record<string, unknown>)[k];
      if (!Object.is(v, w)) return `metrics[${t}].${k}: ${v} vs ${w}`;
    }
  }
  for (const k of ["walls", "obstacles", "species"] as const) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return k;
  }
  return null;
}

describe("snapshots: the Rust world's are the TypeScript core's (I1)", () => {
  const runs: [string, Params, number][] = [
    ["skyStand", presetParams("skyStand"), 25],
    ["forest", presetParams("forest"), 40],
    ["mixedWood", forestParams(160, 9), 35],
    ["oakOpen", presetParams("oakOpen"), 30],
    ["shadow", presetParams("shadow"), 25],
  ];
  for (const [name, params, seasons] of runs) {
    it(name, () => {
      const ts = new World(params);
      const rust = RustWorld.create(params, "parity");
      const builder = new SnapshotBuilder();
      for (let s = 0; s <= seasons; s++) {
        if (s > 0) {
          ts.step();
          ts.discardDead();
          rust.step(1, true);
        }
        if (s % 5 !== 0 && s !== seasons) continue;
        const a = builder.build(ts, 0, FULL_SNAPSHOT);
        const b = rust.snapshot(0, FULL_SNAPSHOT);
        expect(snapshotDiff(a, b), `season ${s}`).toBeNull();
      }
      rust.dispose();
    });
  }
});

describe("checkpoints cross between the cores (I1)", () => {
  const cases: [string, Params, number][] = [
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
  for (const [name, params, seasons] of cases) {
    it(`${name}: TypeScript bytes load in Rust, save back the same, and grow on alike`, () => {
      const ts = new World(params);
      ts.run(seasons);
      ts.setParams({ c3: { ...ts.params.c3, alpha: ts.params.c3.alpha + 0.1 } });
      ts.plantTree(17.25);
      const bytes = saveWorld(ts);
      const rust = RustWorld.load(bytes, "parity");
      expect(Buffer.from(rust.save()).equals(Buffer.from(bytes))).toBe(true);
      ts.run(10);
      rust.step(10);
      expect(rust.hash()).toBe(hashWorld(ts));
      // And back: the Rust world's bytes load in TypeScript.
      const back = loadWorld(rust.save());
      expect(hashWorld(back)).toBe(hashWorld(ts));
      expect(Buffer.from(saveWorld(back)).equals(Buffer.from(rust.save()))).toBe(true);
      rust.dispose();
    });
  }
});

describe("the shipped opening forests load in Rust (I1)", () => {
  // garden-v0.14.0's first-paint checkpoint for a 66-cell plate, seed 10, made by the TypeScript
  // core (cli/first-paint.ts); docs/experiments/code/2026-10-29-i1/first-paint.ts checks all twelve.
  it("garden 0.14.0, 66-10: same bytes back, and the same forest 10 seasons on", () => {
    const gz = readFileSync(new URL("./fixtures/garden-0.14.0-66-10.bin.gz", import.meta.url));
    const bytes = new Uint8Array(gunzipSync(gz));
    const rust = RustWorld.load(bytes, "parity");
    expect(Buffer.from(rust.save()).equals(Buffer.from(bytes))).toBe(true);
    const ts = loadWorld(bytes);
    for (let s = 0; s < 10; s++) {
      ts.step();
      ts.discardDead();
    }
    rust.step(10, true);
    expect(rust.hash()).toBe(hashWorld(ts));
    rust.dispose();
  });
});

describe("production goldens: the WASM build's are the native build's (I1 stage 2)", () => {
  const production = JSON.parse(
    readFileSync(new URL("./golden-production.json", import.meta.url), "utf8"),
  ) as Record<string, string>;
  beforeAll(() => loadWorldsSync("production", readFileSync(wasmUrl.production)));
  for (const c of GOLDEN_CASES) {
    it(caseKey(c), () => {
      const params = isFixtureName(c.preset)
        ? fixtureParams(c.preset, c.seed)
        : presetParams(c.preset, c.seed);
      const world = RustWorld.create(params, "production");
      world.run(c.seasons);
      expect(world.hash()).toBe(production[caseKey(c)]);
      world.dispose();
    });
  }
});
