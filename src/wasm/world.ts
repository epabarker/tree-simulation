/**
 * The whole simulation in the Rust core (I1, ADR 0024), for the page's worker, the Node tools and
 * the tests: a world made from params or checkpoint bytes, stepped, patched and recorded, with
 * snapshots built in Rust and taken out of linear memory in one copy.
 *
 * Two builds: production (`pkg/`: Rust's libm, WASM SIMD, the page's) and parity (`pkg-parity/`:
 * V8's Math, the TypeScript goldens'). Import `./production.ts` or `./parity.ts` to register one,
 * and load it with `loadWorlds` before making worlds.
 */

import { type Params, type ParamsPatch, speciesParams } from "../core/params.ts";
import {
  BUD_SCHEMA,
  METAMER_SCHEMA,
  type RunEvent,
  type RunRecord,
  type Snapshot,
  type SnapshotOptions,
  type TreeMetrics,
} from "../core/types.ts";
import type * as production from "./pkg/core.js";

export type Build = "production" | "parity";
/** A build's wasm-bindgen module (both builds export the same API). */
export type Pkg = typeof production;

const pkgs: Partial<Record<Build, Pkg>> = {};
const loaded: Partial<Record<Build, { pkg: Pkg; memory: { buffer: ArrayBufferLike } }>> = {};

/**
 * Makes a build loadable. `./production.ts` and `./parity.ts` register theirs, so a bundle holds
 * only the builds it imports (the garden's worker: production alone).
 */
export function registerBuild(build: Build, pkg: Pkg): void {
  pkgs[build] = pkg;
}

function pkgOf(build: Build): Pkg {
  const pkg = pkgs[build];
  if (!pkg) throw new Error(`Import src/wasm/${build}.ts to use the ${build} build`);
  return pkg;
}

/** Loads a build from its bytes (Node: `readFileSync(productionWasm)`, from production.ts). */
export function loadWorldsSync(build: Build, bytes: Uint8Array | ArrayBuffer): void {
  if (loaded[build]) return;
  const pkg = pkgOf(build);
  const out = pkg.initSync({ module: bytes });
  loaded[build] = { pkg, memory: out.memory };
}

/** Loads a build by fetching it (the page's worker), from wasm-bindgen's URL beside its glue. */
export async function loadWorlds(build: Build, url?: URL | string): Promise<void> {
  if (loaded[build]) return;
  const pkg = pkgOf(build);
  const out = await pkg.default(url ? { module_or_path: url } : undefined);
  loaded[build] = { pkg, memory: out.memory };
}

function build(b: Build): { pkg: Pkg; memory: { buffer: ArrayBufferLike } } {
  const l = loaded[b];
  if (!l) throw new Error(`The Rust core's ${b} build is not loaded: call loadWorlds first`);
  return l;
}

/** METRIC_NUMBERS (rust/core/src/metrics.rs): TreeMetrics' fields but species, in order. */
const METRIC_NUMBERS = [
  "tree",
  "alive",
  "rootX",
  "age",
  "metamers",
  "buds",
  "dormantBuds",
  "shortShoots",
  "height",
  "crownWidth",
  "centroidOffset",
  "boleHeight",
  "qBase",
  "vBase",
  "meanBudQ",
  "trunkRadius",
  "woodVolume",
  "slenderness",
  "shed",
  "groundLight",
  "production",
  "maintenance",
  "reserve",
  "reproduction",
  "starved",
  "abraded",
  "seeds",
  "sown",
  "crownRatio",
  "branchAngle",
  "released",
  "epicormic",
  "aborted",
  "broken",
] as const;
const FLAGS = new Set(["alive", "sown"]);

function metricsFrom(values: Float64Array, species: string[]): TreeMetrics[] {
  const n = METRIC_NUMBERS.length;
  return species.map((sp, t) => {
    const m: Record<string, number | boolean | string> = { species: sp };
    METRIC_NUMBERS.forEach((k, i) => {
      const v = values[t * n + i] as number;
      m[k] = FLAGS.has(k) ? v === 1 : v;
    });
    return m as unknown as TreeMetrics;
  });
}

/** Every typed array in a snapshot is a view on one buffer: transfer it once. */
export function snapshotTransferables(s: Snapshot): ArrayBuffer[] {
  return [...new Set([s.parent.buffer, s.shadow?.buffer].filter(Boolean))] as ArrayBuffer[];
}

/** tree.rs NUMBERS, after [id, rootX, alive, discarded, sown, metamers, buds] in tree_scalars. */
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

type Schema = Record<
  string,
  Float64ArrayConstructor | Int32ArrayConstructor | Uint8ArrayConstructor
>;
type ColumnsOf<S extends Schema> = { [K in keyof S]: InstanceType<S[K]> };

/** A table's rows in use, copied out of the Rust core. */
export interface TableView<S extends Schema> {
  length: number;
  cols: ColumnsOf<S>;
}

/**
 * One tree of a Rust world, read-only: its scalars and tables as the TypeScript core's Tree had
 * them. Read lazily and again after the world steps, so a view held across seasons stays current.
 */
export class TreeView {
  readonly index: number;
  readonly world: RustWorld;
  private at = -1;
  private s: Float64Array<ArrayBuffer> = new Float64Array(0);
  private tables: { m?: TableView<typeof METAMER_SCHEMA>; b?: TableView<typeof BUD_SCHEMA> } = {};

  constructor(world: RustWorld, index: number) {
    this.world = world;
    this.index = index;
  }

  private scalars(): Float64Array<ArrayBuffer> {
    if (this.at !== this.world.version) {
      this.s = this.world.core().tree_scalars(this.index) as Float64Array<ArrayBuffer>;
      this.tables = {};
      this.at = this.world.version;
    }
    return this.s;
  }

  private number(k: (typeof NUMBERS)[number]): number {
    return this.scalars()[7 + NUMBERS.indexOf(k)] as number;
  }

  private table<S extends Schema>(which: 0 | 1, schema: S, length: number): TableView<S> {
    const cols: Record<string, ArrayLike<number>> = {};
    Object.entries(schema).forEach(([name, Ctor], k) => {
      const bytes = this.world.core().tree_column(this.index, which, k);
      cols[name] = new Ctor(bytes.buffer as ArrayBuffer, bytes.byteOffset, length);
    });
    return { length, cols: cols as ColumnsOf<S> };
  }

  get id(): number {
    return this.scalars()[0] as number;
  }
  get rootX(): number {
    return this.scalars()[1] as number;
  }
  get alive(): boolean {
    return this.scalars()[2] === 1;
  }
  get discarded(): boolean {
    return this.scalars()[3] === 1;
  }
  get sown(): boolean {
    return this.scalars()[4] === 1;
  }
  get species(): string {
    return this.world.core().species_of(this.index);
  }
  get m(): TableView<typeof METAMER_SCHEMA> {
    const n = this.scalars()[5] as number;
    this.tables.m ??= this.table(0, METAMER_SCHEMA, n);
    return this.tables.m;
  }
  get b(): TableView<typeof BUD_SCHEMA> {
    const n = this.scalars()[6] as number;
    this.tables.b ??= this.table(1, BUD_SCHEMA, n);
    return this.tables.b;
  }
  /** R3's σ/σ_target per metamer this season. */
  get stress(): Float64Array {
    return this.world.core().tree_stress(this.index);
  }
  get age(): number {
    return this.number("age");
  }
  get qBase(): number {
    return this.number("qBase");
  }
  get vBase(): number {
    return this.number("vBase");
  }
  get shedCount(): number {
    return this.number("shedCount");
  }
  get meanBudQ(): number {
    return this.number("meanBudQ");
  }
  get qTop(): number {
    return this.number("qTop");
  }
  get production(): number {
    return this.number("production");
  }
  get maintenance(): number {
    return this.number("maintenance");
  }
  get reserve(): number {
    return this.number("reserve");
  }
  get starved(): number {
    return this.number("starved");
  }
  get reproduction(): number {
    return this.number("reproduction");
  }
  get seedPool(): number {
    return this.number("seedPool");
  }
  get seeds(): number {
    return this.number("seeds");
  }
  get abraded(): number {
    return this.number("abraded");
  }
  get released(): number {
    return this.number("released");
  }
  get epicormic(): number {
    return this.number("epicormic");
  }
  get aborted(): number {
    return this.number("aborted");
  }
  get broken(): number {
    return this.number("broken");
  }

  tipX(i: number): number {
    const c = this.m.cols;
    return (c.baseX[i] as number) + (c.length[i] as number) * Math.cos(c.angle[i] as number);
  }

  tipY(i: number): number {
    const c = this.m.cols;
    return (c.baseY[i] as number) + (c.length[i] as number) * Math.sin(c.angle[i] as number);
  }
}

/** form.ts's FORM_COLUMNS (rust/core/src/form.rs), in order. */
export const FORM_COLUMNS = [
  "widestAt",
  "profileCentre",
  "crownFullness",
  "forkHeight",
  "leaderDominance",
  "branchAngle2",
  "limbDroop",
  "limbUpturn",
  "junctionDelta",
  "ldSlope",
  "leafStemSlope",
] as const;
/** Crown-form bands in `profile`. */
export const PROFILE_BANDS = 10;

/** A tree's crown form and allometry (M26): FORM_COLUMNS, and the width profile by height. */
export type FormMetrics = Record<(typeof FORM_COLUMNS)[number], number> & { profile: number[] };

export class RustWorld {
  readonly build: Build;
  /** Bumped whenever the world's state may have changed (TreeView reads again). */
  version = 0;
  private views: TreeView[] = [];
  private metricsAt = -1;
  private metricsCache: TreeMetrics[] = [];
  private readonly inner: Pkg["World"]["prototype"];
  private paramsAt = -1;
  private cached: Params | null = null;

  protected constructor(b: Build, core: Pkg["World"]["prototype"]) {
    this.build = b;
    this.inner = core;
  }

  static create(params: Params, b: Build = "production"): RustWorld {
    return new RustWorld(b, new (build(b).pkg.World)(JSON.stringify(params)));
  }

  /** A world from checkpoint bytes (the TypeScript core's layout, M21). */
  static load(bytes: Uint8Array, b: Build = "production"): RustWorld {
    return new RustWorld(b, build(b).pkg.World.load(bytes));
  }

  save(): Uint8Array {
    return this.inner.save();
  }

  /** Runs `seasons` seasons; `discard` frees dead trees after each (World.discardDead). */
  step(seasons = 1, discard = false): void {
    this.inner.step(seasons, discard);
    this.version += 1;
  }

  /** Runs `seasons` seasons, applying recorded events at their seasons (CLI replay). */
  run(seasons: number, events: readonly RunEvent[] = []): void {
    this.inner.run(seasons, JSON.stringify(events));
    this.version += 1;
  }

  hash(): string {
    return this.inner.hash();
  }

  get season(): number {
    return this.inner.season();
  }

  get storm(): boolean {
    return this.inner.storm();
  }

  /** The world's current params (parsed once per change). */
  get params(): Params {
    const v = this.inner.params_version();
    if (!this.cached || v !== this.paramsAt) {
      this.cached = JSON.parse(this.inner.params()) as Params;
      this.paramsAt = v;
    }
    return this.cached;
  }

  setParams(patch: ParamsPatch): void {
    this.version += 1;
    this.inner.set_params(JSON.stringify(patch));
  }

  removeTree(tree: number): void {
    this.version += 1;
    this.inner.remove_tree(tree);
  }

  plantTree(x: number, species?: string): void {
    this.version += 1;
    this.inner.plant_tree(x, species);
  }

  record(): RunRecord {
    return JSON.parse(this.inner.record()) as RunRecord;
  }

  discardDead(): number {
    this.version += 1;
    return this.inner.discard_dead();
  }

  /** The world's trees, as views (read-only; current after every step). */
  get trees(): TreeView[] {
    const n = this.inner.tree_count();
    for (let i = this.views.length; i < n; i++) this.views.push(new TreeView(this, i));
    return this.views.slice(0, n);
  }

  /** The params tree `t` grows by (its species' merged over the world's, ADR 0016). */
  paramsOf(t: TreeView | { species: string }): Params {
    return t.species ? speciesParams(this.params, t.species) : this.params;
  }

  /** Tree `t`'s metrics this season (metrics.ts's treeMetrics, with the world for groundLight). */
  metricsOf(t: TreeView): TreeMetrics {
    if (this.metricsAt !== this.version) {
      this.metricsCache = this.metrics();
      this.metricsAt = this.version;
    }
    return this.metricsCache[t.index] as TreeMetrics;
  }

  /** Tree `t`'s crown form and allometry (form.ts's formMetrics, M26). */
  formOf(t: TreeView): FormMetrics {
    const v = this.inner.tree_form(t.index);
    const out: Record<string, number | number[]> = {};
    FORM_COLUMNS.forEach((k, i) => {
      out[k] = v[i] as number;
    });
    out.profile = [...v.subarray(FORM_COLUMNS.length)];
    return out as unknown as FormMetrics;
  }

  /** Mean light on the ground over columns [x0, x1], as a fraction of open sky. */
  groundLight(x0: number, x1: number): number {
    return this.inner.ground_light(x0, x1);
  }

  /** {q, vx, vy} of this season's light field at (x, y) for a bud heading `dir`. */
  sample(x: number, y: number, dir: number): { q: number; vx: number; vy: number } {
    const [q, vx, vy] = this.inner.sample(x, y, dir) as unknown as [number, number, number];
    return { q, vx, vy };
  }

  /** The wasm-bindgen object (TreeView reads through it). */
  core(): Pkg["World"]["prototype"] {
    return this.inner;
  }

  get treeCount(): number {
    return this.inner.tree_count();
  }

  /** Every tree's metrics, dead ones too (the CLI's metrics.csv rows, the Node tools). */
  metrics(): TreeMetrics[] {
    const n = this.inner.tree_count();
    const species = Array.from({ length: n }, (_, i) => this.inner.species_of(i));
    return metricsFrom(this.inner.metrics(), species);
  }

  resetSnapshots(): void {
    this.inner.reset_snapshots();
  }

  /** The season's snapshot, copied out of linear memory once; its arrays share one buffer. */
  snapshot(seasonMs: number, options: SnapshotOptions): Snapshot {
    this.inner.snapshot(options.junctions, options.field);
    const [trees, nm, nb, nj, ns] = this.inner.snapshot_counts() as unknown as number[];
    const species = this.inner.snapshot_species();
    const { memory } = build(this.build);
    const buffer = new Uint8Array(
      memory.buffer,
      this.inner.snapshot_ptr(),
      this.inner.snapshot_len(),
    ).slice().buffer;
    let at = 0;
    const take = <T>(
      make: (b: ArrayBuffer, o: number, n: number) => T,
      n: number,
      size: number,
    ) => {
      const out = make(buffer, at, n);
      at += (n * size + 7) & ~7;
      return out;
    };
    const f64 = (n: number) => take((b, o, k) => new Float64Array(b, o, k), n, 8);
    const f32 = (n: number) => take((b, o, k) => new Float32Array(b, o, k), n, 4);
    const i32 = (n: number) => take((b, o, k) => new Int32Array(b, o, k), n, 4);
    const u8 = (n: number) => take((b, o, k) => new Uint8Array(b, o, k), n, 1);
    const metrics = metricsFrom(f64(trees * METRIC_NUMBERS.length), species);
    const params = this.params;
    const s: Snapshot = {
      season: this.season,
      width: params.world.width,
      height: params.world.height,
      periodic: params.world.sides === "periodic",
      storm: this.storm,
      metamerCount: nm,
      parent: i32(nm),
      x0: f32(nm),
      y0: f32(nm),
      angle: f32(nm),
      length: f32(nm),
      radius: f32(nm),
      tree: i32(nm),
      birthId: i32(nm),
      order: u8(nm),
      light: f32(nm),
      resource: f32(nm),
      age: f32(nm),
      stress: f32(nm),
      prevIndex: i32(nm),
      budCount: nb,
      budMetamer: i32(nb),
      budState: u8(nb),
      budQ: f32(nb),
      junctions: f32(nj),
      shadow: null,
      walls: params.c2.enabled ? params.world.walls : [],
      obstacles: params.world.obstacles ?? [],
      species: Object.fromEntries(
        Object.entries(params.species ?? {}).map(([name, p]) => [
          name,
          { common: p.common, latin: p.latin, leaf: p.leaf },
        ]),
      ),
      metrics,
      seasonMs,
      snapshotMs: 0,
    };
    if (ns > 0) s.shadow = f32(ns);
    return s;
  }

  dispose(): void {
    this.inner.free();
  }
}
