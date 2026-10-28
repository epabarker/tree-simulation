/**
 * The simulated world (spec §5 "Global state"): parameters, trees, the shared light model,
 * the season counter and a log of interactive events, so any session can be replayed exactly.
 */

import { type LightModel, UniformLight } from "./light/light-model.ts";
import { PooledLight } from "./light/pooled.ts";
import { ShadowTriangle } from "./light/shadow-triangle.ts";
import { SkySweep } from "./light/sky-sweep.ts";
import { clone, mergeParams, type Params, type ParamsPatch } from "./params.ts";
import { plantSeedling } from "./principles/c1-buds.ts";
import { type PhaseMark, runSeason } from "./season.ts";
import { Tree } from "./tree.ts";

/** A change applied at the start of `season` (before that season runs). */
export type RunEvent =
  | { season: number; type: "params"; patch: ParamsPatch }
  | { season: number; type: "removeTree"; tree: number }
  | { season: number; type: "plantTree"; x: number; species?: string };

/** Everything needed to reproduce a run: initial params plus the event log. */
export interface RunRecord {
  params: Params;
  events: RunEvent[];
  seasons: number;
}

export function makeLight(params: Params): LightModel {
  const { width, height } = params.world;
  if (params.c2.enabled && params.c2.model === "pooled") {
    return new PooledLight(width, height, params.c2);
  }
  if (params.c2.enabled && params.c2.model === "sky") {
    return new SkySweep(width, height, params.c2, params.world.sides === "periodic");
  }
  if (params.c2.enabled) return new ShadowTriangle(width, height, params.c2);
  return new UniformLight(width, height, params.c2.C);
}

export class World {
  readonly initialParams: Params;
  params: Params;
  season = 0;
  /** Planted trees in params order, then O4 recruits appended in order of establishment. */
  readonly trees: Tree[];
  /** Seedlings established at the end of the last season (O4). */
  recruits = 0;
  /** The last season was a storm (M16, O2 `stormP`). */
  storm = false;
  /** O2: which tree's foliage holds each cell this season (W × H, −1 none, −2 several). */
  owner: Int32Array;
  /** The owner grid was filled this season (O2 abrasion, or R5's neighbour signal). */
  ownersTagged = false;
  light: LightModel;
  /** Events applied so far. */
  readonly log: RunEvent[] = [];
  private pending: RunEvent[] = [];
  private speciesParams = new Map<string, Params>();

  constructor(params: Params) {
    this.initialParams = clone(params);
    this.params = clone(params);
    this.light = makeLight(this.params);
    this.owner = new Int32Array(this.params.world.width * this.params.world.height);
    this.trees = this.params.trees.map((spec, id) => {
      const tree = new Tree(id, spec.x);
      tree.species = spec.species ?? "";
      tree.alive = false; // planted when its season comes
      return tree;
    });
    this.plantDue();
  }

  /** Queues a parameter change for the next season boundary. `trees` cannot change mid-run. */
  setParams(patch: ParamsPatch): void {
    const { trees: _ignored, ...rest } = patch;
    this.pending.push({ season: this.season, type: "params", patch: rest });
  }

  /** Queues the removal of a tree at the next season boundary (deaths take effect last, §6). */
  removeTree(tree: number): void {
    this.pending.push({ season: this.season, type: "removeTree", tree });
  }

  /**
   * Queues a seedling at x for the next season boundary (a visitor sowing, D2). It is appended
   * to `trees` like an O4 recruit, unless a live trunk stands within a cell of x.
   */
  plantTree(x: number, species?: string): void {
    this.pending.push({
      season: this.season,
      type: "plantTree",
      x,
      ...(species ? { species } : {}),
    });
  }

  /**
   * The params a tree grows by (ADR 0016): the world's, with its species' patch on top, built
   * once per species and dropped when params change. A tree without a species gets the world's
   * params object itself, so single-species worlds are exactly as before.
   */
  paramsOf(tree: Tree): Params {
    if (!tree.species) return this.params;
    let p = this.speciesParams.get(tree.species);
    if (!p) {
      const patch = this.params.species?.[tree.species];
      if (patch) {
        const { common: _c, latin: _l, leaf: _f, ...groups } = patch;
        p = mergeParams(this.params, groups);
      } else {
        p = this.params;
      }
      this.speciesParams.set(tree.species, p);
    }
    return p;
  }

  /** Applies queued events, plants due seedlings and runs one season (`mark`: phase timer). */
  step(mark?: PhaseMark): void {
    for (const event of this.pending) this.apply({ ...event, season: this.season });
    this.pending = [];
    this.plantDue();
    runSeason(this, mark);
    this.season += 1;
  }

  /** Runs `seasons` seasons, applying any recorded events at their seasons (CLI replay). */
  run(seasons: number, events: readonly RunEvent[] = []): void {
    const queue = [...events].sort((a, b) => a.season - b.season);
    let next = 0;
    for (let s = 0; s < seasons; s++) {
      while (next < queue.length && (queue[next] as RunEvent).season <= this.season) {
        this.apply(queue[next] as RunEvent);
        next += 1;
      }
      this.step();
    }
  }

  /**
   * Frees the tables of trees that have died, for a page that runs for hours (a forest with
   * recruitment piles up dead trees). No phase of a season reads a dead tree's rows, so live trees
   * grow exactly as before, but `hashWorld` fingerprints dead trees too: the CLI and tests never
   * call this. Returns how many trees were discarded.
   */
  discardDead(): number {
    let n = 0;
    for (const tree of this.trees) {
      if (tree.alive || tree.discarded || tree.m.length === 0) continue;
      tree.discard();
      n += 1;
    }
    return n;
  }

  /** Events queued for the next season boundary (a checkpoint carries them, M21). */
  get queued(): readonly RunEvent[] {
    return this.pending;
  }

  /**
   * Takes over a saved state (checkpoint.ts, M21): params, season, flags, the event log and
   * queue, and the trees. The light model and the species cache are rebuilt from the params;
   * everything else a season reads is recomputed in that season.
   */
  restoreState(state: {
    params: Params;
    season: number;
    recruits: number;
    storm: boolean;
    log: RunEvent[];
    pending: RunEvent[];
    trees: Tree[];
  }): void {
    this.params = clone(state.params);
    this.season = state.season;
    this.recruits = state.recruits;
    this.storm = state.storm;
    this.log.length = 0;
    this.log.push(...state.log);
    this.pending = [...state.pending];
    this.trees.length = 0;
    this.trees.push(...state.trees);
    this.speciesParams.clear();
    this.light = makeLight(this.params);
    this.owner = new Int32Array(this.params.world.width * this.params.world.height);
  }

  record(): RunRecord {
    return { params: clone(this.initialParams), events: clone(this.log), seasons: this.season };
  }

  private apply(event: RunEvent): void {
    this.log.push(event);
    if (event.type === "params") {
      this.params = mergeParams(this.params, event.patch);
      this.speciesParams.clear();
      this.light = makeLight(this.params);
    } else if (event.type === "plantTree") {
      const { width: W, sides } = this.params.world;
      const x = sides === "periodic" ? ((event.x % W) + W) % W : event.x;
      if (x < 0 || x >= W) return;
      if (this.trees.some((t) => t.alive && Math.abs(t.rootX - x) < 1)) return;
      const tree = new Tree(this.trees.length, x);
      tree.sown = true;
      // A visitor's seed is of the species asked for, else of the nearest live tree.
      let nearest: Tree | undefined;
      for (const t of this.trees) {
        if (t.alive && (!nearest || Math.abs(t.rootX - x) < Math.abs(nearest.rootX - x)))
          nearest = t;
      }
      tree.species = event.species ?? nearest?.species ?? "";
      plantSeedling(tree, this.paramsOf(tree), this.season);
      this.trees.push(tree);
    } else {
      const tree = this.trees[event.tree];
      if (tree) tree.alive = false;
    }
  }

  private plantDue(): void {
    this.params.trees.forEach((spec, id) => {
      const tree = this.trees[id] as Tree;
      const unplanted = tree.m.length === 0 && !tree.discarded;
      if (unplanted && (spec.plantSeason ?? 0) <= this.season && !this.isRemoved(id)) {
        tree.alive = true;
        plantSeedling(tree, this.paramsOf(tree), this.season);
      }
    });
  }

  private isRemoved(id: number): boolean {
    return this.log.some((e) => e.type === "removeTree" && e.tree === id);
  }
}
