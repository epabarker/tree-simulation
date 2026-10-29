/**
 * I1 (ADR 0024): the season's phases one at a time in the Rust core, the rest in TypeScript.
 *
 * - **Hybrid runs** (`useHybrid(phases)`): every world made afterwards runs the named phases in
 *   Rust. Before a Rust phase the tree's whole state (tables, scalars, per-season scratch) is
 *   copied into the bridge's world, and after it back; the light model is the Rust core's for
 *   both sides, so a phase in either language deposits into and samples one field. The goldens
 *   must come out unchanged.
 * - **Side by side** (`useSideBySide(report)`): the world runs in TypeScript, and before each
 *   phase its state is copied into Rust, the phase run there too, and the two results compared
 *   bit for bit: tables, scalars, the scratch the phase writes and later phases read, and the
 *   world's flags, owner grid and light field.
 *
 * Test scaffolding for porting the core phase by phase (rust/wasm/src/bridge.rs); it loads the
 * parity build, so its Math is V8's.
 */

import type { LightModel, LightSample } from "../core/light/light-model.ts";
import type { Params, Wall } from "../core/params.ts";
import { type Phase, type SeasonPhases, setSeasonPhases, TS_PHASES } from "../core/season.ts";
import { BUD_SCHEMA, METAMER_SCHEMA, Tree } from "../core/tree.ts";
import { setLightFactory, type World } from "../core/world.ts";
import { wasm } from "./core.ts";
import { Bridge } from "./pkg-parity/core.js";

/** tree.rs NUMBERS: the tree's numeric scalars, after alive, discarded and sown. */
const NUMBERS = [
  "age",
  "nextMetamerId",
  "nextBudId",
  "qBase",
  "vBase",
  "shedCount",
  "meanBudQ",
  "qTop",
  "production",
  "maintenance",
  "reserve",
  "starved",
  "reproduction",
  "seedPool",
  "seeds",
  "abraded",
  "released",
  "epicormic",
  "aborted",
  "broken",
] as const;

/** tree.rs `scratch_mut`, in order. */
const SCRATCH = [
  "qSlot",
  "vSlot",
  "scratchF",
  "pSum",
  "mSum",
  "pathLen",
  "prevRadius",
  "loadW",
  "loadS",
  "stress",
  "nodeShade",
] as const;
type ScratchName = (typeof SCRATCH)[number];

type Kind = "f64" | "i32" | "u8";
const kindOf = (ctor: unknown): Kind =>
  ctor === Float64Array ? "f64" : ctor === Int32Array ? "i32" : "u8";
const METAMER_COLS = Object.entries(METAMER_SCHEMA).map(([n, c]) => [n, kindOf(c)] as const);
const BUD_COLS = Object.entries(BUD_SCHEMA).map(([n, c]) => [n, kindOf(c)] as const);

type AnyCol = Float64Array | Int32Array | Uint8Array;
type Cols = Record<string, AnyCol>;
type Scalars = Record<(typeof NUMBERS)[number], number>;

function scalars(t: Tree): Float64Array {
  const out = new Float64Array(3 + NUMBERS.length);
  out[0] = t.alive ? 1 : 0;
  out[1] = t.discarded ? 1 : 0;
  out[2] = t.sown ? 1 : 0;
  NUMBERS.forEach((k, i) => {
    out[3 + i] = (t as unknown as Scalars)[k];
  });
  return out;
}

function push(bridge: Bridge, i: number, t: Tree): void {
  bridge.set_tree(i, t.id, t.rootX, t.species, scalars(t), t.m.length, t.b.length);
  const columns = (table: 0 | 1, list: typeof METAMER_COLS, cols: Cols, n: number) => {
    list.forEach(([name, kind], k) => {
      const col = (cols[name] as AnyCol).subarray(0, n);
      if (kind === "f64") bridge.set_col_f64(i, table, k, col as Float64Array);
      else if (kind === "i32") bridge.set_col_i32(i, table, k, col as Int32Array);
      else bridge.set_col_u8(i, table, k, col as Uint8Array);
    });
  };
  columns(0, METAMER_COLS, t.m.cols as unknown as Cols, t.m.length);
  columns(1, BUD_COLS, t.b.cols as unknown as Cols, t.b.length);
  SCRATCH.forEach((name, k) => {
    const a = t[name];
    const n = name === "qSlot" || name === "vSlot" ? 3 * t.m.length : t.m.length;
    bridge.set_scratch(i, k, a.subarray(0, Math.min(a.length, n)));
  });
}

/** Copies tree `i` of the bridge's world into `t` (its tables, scalars and scratch). */
function pull(bridge: Bridge, i: number, t: Tree): void {
  const [nm, nb] = bridge.tree_lens(i) as unknown as [number, number];
  const columns = (table: 0 | 1, list: typeof METAMER_COLS, cols: () => Cols) => {
    list.forEach(([name, kind], k) => {
      const v =
        kind === "f64"
          ? bridge.col_f64(i, table, k)
          : kind === "i32"
            ? bridge.col_i32(i, table, k)
            : bridge.col_u8(i, table, k);
      (cols()[name] as AnyCol).set(v as never);
    });
  };
  t.m.grow(nm);
  t.m.length = nm;
  columns(0, METAMER_COLS, () => t.m.cols as unknown as Cols);
  t.b.grow(nb);
  t.b.length = nb;
  columns(1, BUD_COLS, () => t.b.cols as unknown as Cols);
  const s = bridge.tree_scalars(i);
  t.alive = s[0] === 1;
  t.discarded = s[1] === 1;
  t.sown = s[2] === 1;
  NUMBERS.forEach((k, j) => {
    (t as unknown as Scalars)[k] = s[3 + j] as number;
  });
  t.species = bridge.tree_species(i);
  // Size the scratch for the tables first, as the TypeScript phase would have (ensureScratch
  // reallocates, dropping contents): later TypeScript phases write into it by row, as mechanics
  // writes its break marks into scratchU after girth's ensureScratch.
  t.ensureScratch();
  SCRATCH.forEach((name, k) => {
    const v = bridge.scratch(i, k);
    if (t[name].length < v.length) t[name] = new Float64Array(v.length);
    t[name].set(v);
  });
}

function pushWorld(bridge: Bridge, world: World, trees: readonly Tree[]): void {
  bridge.set_world(world.season, world.storm, world.ownersTagged, world.recruits);
  bridge.set_owner(world.owner);
  bridge.set_tree_count(world.trees.length);
  for (const t of trees) push(bridge, t.id, t);
}

/** The bridge's world back into `world`: flags, owner grid and the given trees (new ones too). */
function pullWorld(bridge: Bridge, world: World, trees: readonly Tree[]): void {
  world.storm = bridge.storm();
  world.ownersTagged = bridge.owners_tagged();
  world.recruits = bridge.recruits();
  world.owner.set(bridge.owner());
  for (const t of trees) pull(bridge, t.id, t);
  for (let i = world.trees.length; i < bridge.tree_count(); i++) {
    const t = new Tree(bridge.tree_id(i), bridge.tree_root_x(i));
    pull(bridge, i, t);
    world.trees.push(t);
  }
}

/** The bridge's light model behind LightModel: one field for both cores. */
class RustLight implements LightModel {
  readonly width: number;
  readonly height: number;
  private readonly bridge: Bridge;
  private out = new Float64Array(0);

  constructor(bridge: Bridge) {
    this.bridge = bridge;
    this.width = bridge.light_width();
    this.height = bridge.light_height();
  }

  clear(): void {
    this.bridge.light_clear();
  }

  deposit(x: number, y: number, area = 1): void {
    this.bridge.light_deposit(x, y, area);
  }

  addWall(w: Wall): void {
    this.bridge.light_add_wall(w.x, w.y, w.width, w.height, w.shade);
  }

  compute(season = 0): void {
    this.bridge.light_compute(season);
  }

  sample(x: number, y: number, dir: number, out: LightSample): void {
    this.bridge.light_sample(x, y, dir);
    let o = this.out;
    if (o.buffer !== wasm().memory.buffer) {
      o = this.out = new Float64Array(wasm().memory.buffer, this.bridge.out_ptr(), 3);
    }
    out.q = o[0] as number;
    out.vx = o[1] as number;
    out.vy = o[2] as number;
  }

  field(): Float64Array<ArrayBuffer> | null {
    return this.bridge.light_has_field() ? new Float64Array(this.bridge.light_field()) : null;
  }
}

/** Every phase in a list, in season order. */
export const ALL_PHASES: readonly Phase[] = [
  "light",
  "sample",
  "allocate",
  "grow",
  "shed",
  "girth",
  "mechanics",
  "commit",
  "deaths",
];

let active: Bridge | null = null;

function freshBridge(): Bridge {
  active?.free();
  active = new Bridge();
  return active;
}

/** The season's phases with those in `rust` run in the Rust core. */
function hybridPhases(bridge: Bridge, rust: ReadonlySet<Phase>): SeasonPhases {
  const tree = (run: (i: number) => void) => (world: World, t: Tree) => {
    pushWorld(bridge, world, [t]);
    run(t.id);
    pullWorld(bridge, world, [t]);
  };
  const ts = TS_PHASES;
  return {
    light: rust.has("light")
      ? (world) => {
          pushWorld(bridge, world, world.trees);
          const live = [...bridge.phase_light()];
          pullWorld(bridge, world, world.trees);
          return live.map((i) => world.trees[i] as Tree);
        }
      : ts.light,
    sample: rust.has("sample") ? tree((i) => bridge.phase_sample(i)) : ts.sample,
    allocate: rust.has("allocate") ? tree((i) => bridge.phase_allocate(i)) : ts.allocate,
    grow: rust.has("grow") ? tree((i) => bridge.phase_grow(i)) : ts.grow,
    shed: rust.has("shed")
      ? (world, t, evaluated) => tree((i) => bridge.phase_shed(i, evaluated))(world, t)
      : ts.shed,
    girth: rust.has("girth") ? tree((i) => bridge.phase_girth(i)) : ts.girth,
    mechanics: rust.has("mechanics") ? tree((i) => bridge.phase_mechanics(i)) : ts.mechanics,
    commit: rust.has("commit") ? tree((i) => bridge.phase_commit(i)) : ts.commit,
    deaths: rust.has("deaths")
      ? (world, live) => {
          pushWorld(bridge, world, world.trees);
          bridge.phase_deaths(new Uint32Array(live.map((t) => t.id)));
          pullWorld(bridge, world, world.trees);
        }
      : ts.deaths,
  };
}

/**
 * Worlds made from now on run `rust`'s phases in the Rust core, with the Rust light model for
 * every phase; `useHybrid(null)` restores the TypeScript core.
 */
export function useHybrid(rust: readonly Phase[] | null): void {
  if (!rust) {
    setSeasonPhases(null);
    setLightFactory(null);
    return;
  }
  wasm();
  const bridge = freshBridge();
  setLightFactory((params: Params) => {
    bridge.set_params(JSON.stringify(params));
    return new RustLight(bridge);
  });
  setSeasonPhases(hybridPhases(bridge, new Set(rust)));
}

/** A difference the side-by-side run found: the phase, the season, and what differed. */
export interface Mismatch {
  phase: Phase;
  season: number;
  what: string;
}

function sameArray(a: ArrayLike<number>, b: ArrayLike<number>, n: number): number {
  for (let i = 0; i < n; i++) if (!Object.is(a[i], b[i])) return i;
  return -1;
}

/** The first way trees `a` (TypeScript) and `b` (Rust) differ, or null. */
function treeDiff(a: Tree, b: Tree, scratch: [ScratchName, number][]): string | null {
  if (a.m.length !== b.m.length) return `tree ${a.id}: ${a.m.length} metamers, Rust ${b.m.length}`;
  if (a.b.length !== b.b.length) return `tree ${a.id}: ${a.b.length} buds, Rust ${b.b.length}`;
  const tables = [
    ["metamer", METAMER_COLS, a.m.cols, b.m.cols, a.m.length],
    ["bud", BUD_COLS, a.b.cols, b.b.cols, a.b.length],
  ] as const;
  for (const [label, list, ca, cb, n] of tables) {
    for (const [name] of list) {
      const x = (ca as unknown as Cols)[name] as AnyCol;
      const y = (cb as unknown as Cols)[name] as AnyCol;
      const at = sameArray(x, y, n);
      if (at >= 0) return `tree ${a.id} ${label} ${name}[${at}]: ${x[at]}, Rust ${y[at]}`;
    }
  }
  const sa = scalars(a);
  const sb = scalars(b);
  const at = sameArray(sa, sb, sa.length);
  if (at >= 0) {
    const name = at < 3 ? ["alive", "discarded", "sown"][at] : NUMBERS[at - 3];
    return `tree ${a.id} ${name}: ${sa[at]}, Rust ${sb[at]}`;
  }
  if (a.species !== b.species) return `tree ${a.id} species: ${a.species}, Rust ${b.species}`;
  for (const [name, n] of scratch) {
    const k = sameArray(a[name], b[name], n);
    if (k >= 0) return `tree ${a.id} ${name}[${k}]: ${a[name][k]}, Rust ${b[name][k]}`;
  }
  return null;
}

/** A copy of `t` taken from the bridge's tree `i`. */
function pulled(bridge: Bridge, i: number): Tree {
  const t = new Tree(bridge.tree_id(i), bridge.tree_root_x(i));
  pull(bridge, i, t);
  return t;
}

/**
 * Worlds made from now on run in TypeScript and every phase also in Rust from the same state;
 * each difference is passed to `report`. `useSideBySide(null)` stops.
 */
export function useSideBySide(
  report: ((m: Mismatch) => void) | null,
  phases: readonly Phase[] = ALL_PHASES,
): void {
  if (!report) {
    setSeasonPhases(null);
    setLightFactory(null);
    return;
  }
  wasm();
  const bridge = freshBridge();
  // The TypeScript world keeps its own light model; the bridge builds its own from the params.
  setLightFactory((params: Params) => {
    bridge.set_params(JSON.stringify(params));
    return null;
  });
  const ts = TS_PHASES;
  const compared = new Set(phases);
  const check = (
    phase: Phase,
    world: World,
    a: Tree,
    b: Tree,
    scratch: [ScratchName, number][],
  ) => {
    const what = treeDiff(a, b, scratch);
    if (what) report({ phase, season: world.season, what });
  };
  type TreePhase = (world: World, tree: Tree, evaluated?: number) => void;
  const perTree =
    (
      phase: Phase,
      run: (i: number, evaluated: number) => void,
      tsPhase: (world: World, tree: Tree, evaluated: number) => void,
      scratch: (world: World, t: Tree) => [ScratchName, number][],
    ): TreePhase =>
    (world, t, evaluated) => {
      if (!compared.has(phase)) return tsPhase(world, t, evaluated ?? 0);
      pushWorld(bridge, world, [t]);
      run(t.id, evaluated ?? 0);
      const rust = pulled(bridge, t.id);
      tsPhase(world, t, evaluated ?? 0);
      check(phase, world, t, rust, scratch(world, t));
    };
  const rows = (t: Tree) => t.m.length;
  const sideBySide: SeasonPhases = {
    light: (world) => {
      // The Rust light model is always computed: later Rust phases sample it.
      pushWorld(bridge, world, world.trees);
      const rustLive = [...bridge.phase_light()];
      const rust = world.trees.map((_, i) => pulled(bridge, i));
      const live = ts.light(world);
      if (!compared.has("light")) return live;
      const ids = live.map((t) => t.id);
      if (ids.join() !== rustLive.join()) {
        report({ phase: "light", season: world.season, what: `live ${ids}, Rust ${rustLive}` });
      }
      for (const t of world.trees) check("light", world, t, rust[t.id] as Tree, []);
      if (world.storm !== bridge.storm()) {
        report({ phase: "light", season: world.season, what: "storm" });
      }
      if (world.ownersTagged) {
        const at = sameArray(world.owner, bridge.owner(), world.owner.length);
        if (at >= 0) report({ phase: "light", season: world.season, what: `owner[${at}]` });
      }
      // Q and V at fixed points (models without a field, pooled and uniform, too).
      const probe = { q: 0, vx: 0, vy: 0 };
      for (let k = 0; k < 64; k++) {
        const x = ((k % 8) + 0.5) * (world.light.width / 8);
        const y = (Math.floor(k / 8) + 0.5) * (world.light.height / 8);
        world.light.sample(x, y, 1, probe);
        bridge.light_sample(x, y, 1);
        const o = new Float64Array(wasm().memory.buffer, bridge.out_ptr(), 3);
        if (!Object.is(o[0], probe.q) || !Object.is(o[1], probe.vx) || !Object.is(o[2], probe.vy)) {
          report({ phase: "light", season: world.season, what: `sample at (${x}, ${y})` });
          break;
        }
      }
      const field = world.light.field();
      if (field) {
        const other = bridge.light_field();
        const at = sameArray(field, other, field.length);
        if (at >= 0 || other.length !== field.length) {
          report({ phase: "light", season: world.season, what: `light field[${at}]` });
        }
      }
      return live;
    },
    sample: perTree(
      "sample",
      (i) => bridge.phase_sample(i),
      ts.sample,
      (world, t) => (world.paramsOf(t).r5.enabled ? [["nodeShade", rows(t)]] : []),
    ),
    allocate: perTree(
      "allocate",
      (i) => bridge.phase_allocate(i),
      ts.allocate,
      (world, t) => {
        const p = world.paramsOf(t);
        const out: [ScratchName, number][] = [["qSlot", 3 * rows(t)]];
        if (p.c3.mode === "bh") out.push(["vSlot", 3 * rows(t)]);
        if (p.r1.enabled) out.push(["pSum", rows(t)], ["mSum", rows(t)], ["pathLen", rows(t)]);
        return out;
      },
    ),
    grow: perTree(
      "grow",
      (i) => bridge.phase_grow(i),
      ts.grow,
      () => [],
    ),
    shed: perTree(
      "shed",
      (i, e) => bridge.phase_shed(i, e),
      ts.shed,
      () => [],
    ),
    girth: perTree(
      "girth",
      (i) => bridge.phase_girth(i),
      ts.girth,
      (world, t) => (world.paramsOf(t).r3.enabled ? [["prevRadius", rows(t)]] : []),
    ),
    mechanics: perTree(
      "mechanics",
      (i) => bridge.phase_mechanics(i),
      ts.mechanics,
      (world, t) => (world.paramsOf(t).r3.enabled ? [["stress", rows(t)]] : []),
    ),
    commit: perTree(
      "commit",
      (i) => bridge.phase_commit(i),
      ts.commit,
      () => [],
    ),
    deaths: (world, live) => {
      if (!compared.has("deaths")) return ts.deaths(world, live);
      pushWorld(bridge, world, world.trees);
      bridge.phase_deaths(new Uint32Array(live.map((t) => t.id)));
      const rust: Tree[] = [];
      for (let i = 0; i < bridge.tree_count(); i++) rust.push(pulled(bridge, i));
      const recruits = bridge.recruits();
      ts.deaths(world, live);
      if (rust.length !== world.trees.length) {
        report({
          phase: "deaths",
          season: world.season,
          what: `${world.trees.length} trees, Rust ${rust.length}`,
        });
        return;
      }
      for (const t of world.trees) check("deaths", world, t, rust[t.id] as Tree, []);
      if (!Object.is(recruits, world.recruits)) {
        report({ phase: "deaths", season: world.season, what: "recruits" });
      }
    },
  };
  setSeasonPhases(sideBySide);
}
