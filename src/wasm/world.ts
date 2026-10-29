/**
 * The whole simulation in the Rust core (I1, ADR 0024), for the page's worker, the Node tools and
 * the tests: a world made from params or checkpoint bytes, stepped, patched and recorded, with
 * snapshots built in Rust and taken out of linear memory in one copy.
 *
 * Two builds: production (`pkg/`: Rust's libm, WASM SIMD, the page's) and parity (`pkg-parity/`:
 * V8's Math, the TypeScript goldens'). Import `./production.ts` or `./parity.ts` to register one,
 * and load it with `loadWorlds` before making worlds.
 */

import type { TreeMetrics } from "../core/metrics.ts";
import type { Params, ParamsPatch } from "../core/params.ts";
import type { Snapshot, SnapshotOptions } from "../core/snapshot.ts";
import type { RunEvent, RunRecord } from "../core/world.ts";
import type * as production from "./pkg/core.js";

export type Build = "production" | "parity";
/** A build's wasm-bindgen module (both builds export the same API). */
export type Pkg = typeof production;

const pkgs: Partial<Record<Build, Pkg>> = {};
const loaded: Partial<Record<Build, { pkg: Pkg; memory: WebAssembly.Memory }>> = {};

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

function build(b: Build): { pkg: Pkg; memory: WebAssembly.Memory } {
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

export class RustWorld {
  readonly build: Build;
  private readonly core: Pkg["World"]["prototype"];
  private paramsAt = -1;
  private cached: Params | null = null;

  private constructor(b: Build, core: Pkg["World"]["prototype"]) {
    this.build = b;
    this.core = core;
  }

  static create(params: Params, b: Build = "production"): RustWorld {
    return new RustWorld(b, new (build(b).pkg.World)(JSON.stringify(params)));
  }

  /** A world from checkpoint bytes (the TypeScript core's layout, M21). */
  static load(bytes: Uint8Array, b: Build = "production"): RustWorld {
    return new RustWorld(b, build(b).pkg.World.load(bytes));
  }

  save(): Uint8Array {
    return this.core.save();
  }

  /** Runs `seasons` seasons; `discard` frees dead trees after each (World.discardDead). */
  step(seasons = 1, discard = false): void {
    this.core.step(seasons, discard);
  }

  /** Runs `seasons` seasons, applying recorded events at their seasons (CLI replay). */
  run(seasons: number, events: readonly RunEvent[] = []): void {
    this.core.run(seasons, JSON.stringify(events));
  }

  hash(): string {
    return this.core.hash();
  }

  get season(): number {
    return this.core.season();
  }

  get storm(): boolean {
    return this.core.storm();
  }

  /** The world's current params (parsed once per change). */
  get params(): Params {
    const v = this.core.params_version();
    if (!this.cached || v !== this.paramsAt) {
      this.cached = JSON.parse(this.core.params()) as Params;
      this.paramsAt = v;
    }
    return this.cached;
  }

  setParams(patch: ParamsPatch): void {
    this.core.set_params(JSON.stringify(patch));
  }

  removeTree(tree: number): void {
    this.core.remove_tree(tree);
  }

  plantTree(x: number, species?: string): void {
    this.core.plant_tree(x, species);
  }

  record(): RunRecord {
    return JSON.parse(this.core.record()) as RunRecord;
  }

  discardDead(): number {
    return this.core.discard_dead();
  }

  get treeCount(): number {
    return this.core.tree_count();
  }

  /** Every tree's metrics, dead ones too (the CLI's metrics.csv rows, the Node tools). */
  metrics(): TreeMetrics[] {
    const n = this.core.tree_count();
    const species = Array.from({ length: n }, (_, i) => this.core.species_of(i));
    return metricsFrom(this.core.metrics(), species);
  }

  resetSnapshots(): void {
    this.core.reset_snapshots();
  }

  /** The season's snapshot, copied out of linear memory once; its arrays share one buffer. */
  snapshot(seasonMs: number, options: SnapshotOptions): Snapshot {
    this.core.snapshot(options.junctions, options.field);
    const [trees, nm, nb, nj, ns] = this.core.snapshot_counts() as unknown as number[];
    const species = this.core.snapshot_species();
    const { memory } = build(this.build);
    const buffer = new Uint8Array(
      memory.buffer,
      this.core.snapshot_ptr(),
      this.core.snapshot_len(),
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
    this.core.free();
  }
}
