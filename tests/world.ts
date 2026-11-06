/**
 * The Rust core under the names the TypeScript core had (`new World(params)`, `treeMetrics`,
 * `groundLight`, `hashWorld`, …), for the structural tests here and the 2D evidence in
 * evidence-2d/. Worlds made inside a test are freed when it ends: a 3D world holds ≈ 70 MB.
 */
import { readFileSync } from "node:fs";
import { afterEach, expect } from "vitest";
import type { Params } from "../src/core/params.ts";
import { BudState, type RunEvent, type TreeMetrics } from "../src/core/types.ts";
import { coreWasm, loadWorldsSync, RustWorld, type TreeView } from "../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));

export type Tree = TreeView;
export type { TreeMetrics };

/** Worlds made inside a test, freed when it ends: a 3D world holds ≈ 70 MB of light field. */
const made: RustWorld[] = [];
afterEach(() => {
  for (const w of made.splice(0)) w.dispose();
});

/**
 * Live metamers past which a world is reported as unregulated. WASM's 4 GB runs out near 3.6M (an
 * unregulated tree doubles each season), and its trap leaves the world borrowed, so every later
 * call into the module fails too: the guard turns that into one failed assertion.
 */
export const METAMER_CAP = 1_500_000;

/** `new World(params)`: a Rust world, its growth guarded by METAMER_CAP. */
export class World extends RustWorld {
  constructor(params: Params) {
    super(RustWorld.create(params).core());
    if (expect.getState().currentTestName) made.push(this);
  }

  override step(seasons = 1, discard = false): void {
    for (let k = 0; k < seasons; k++) {
      super.step(1, discard);
      this.guard();
    }
  }

  override run(seasons: number, events: readonly RunEvent[] = []): void {
    // A replay applies its events by season inside one call; it replays a run that was guarded.
    if (events.length > 0) {
      super.run(seasons, events);
      return;
    }
    for (let k = 0; k < seasons; k++) {
      super.run(1);
      this.guard();
    }
  }

  private guard(): void {
    let n = 0;
    for (const t of this.trees) n += t.m.length;
    if (n > METAMER_CAP)
      throw new Error(`unregulated growth: ${n} live metamers at season ${this.season}`);
  }
}

/** A tree's metrics this season; without `world`, groundLight is NaN, as treeMetrics(t) gave. */
export function treeMetrics(tree: TreeView, world?: RustWorld): TreeMetrics {
  const m = tree.world.metricsOf(tree);
  return world ? m : { ...m, groundLight: Number.NaN };
}

export function groundLight(world: RustWorld, x0: number, x1: number): number {
  return world.groundLight(x0, x1);
}

export function hashWorld(world: RustWorld): string {
  return world.hash();
}

export function isLiveBud(state: number): boolean {
  return state === BudState.active || state === BudState.dormant || state === BudState.shortShoot;
}

/** The world as checkpoint bytes (M21). */
export function saveWorld(world: RustWorld): Uint8Array {
  return world.save();
}

/** A world from checkpoint bytes. */
export function loadWorld(bytes: Uint8Array): RustWorld {
  return RustWorld.load(bytes);
}

/** Elevation of a direction above the horizontal, degrees, whichever side it heads. */
const elevation = (a: number) => (Math.atan2(Math.sin(a), Math.abs(Math.cos(a))) * 180) / Math.PI;

/**
 * M9's limb measure (form.ts's limbShapes, measured here from the tables): per first-order limb
 * of at least 10 metamers, its droop (base − lowest elevation) and upturn (tip − lowest), degrees.
 */
export function limbShapes(tree: TreeView): { droop: number; upturn: number }[] {
  const c = tree.m.cols;
  const axes = new Map<number, number[]>();
  for (let i = 0; i < tree.m.length; i++) {
    if (c.order[i] !== 1) continue;
    const list = axes.get(c.axis[i] as number) ?? [];
    list.push(elevation(Math.atan2(c.hy[i] as number, c.hx[i] as number)));
    axes.set(c.axis[i] as number, list);
  }
  return [...axes.values()]
    .filter((e) => e.length >= 10)
    .map((e) => {
      const low = Math.min(...e);
      return { droop: (e[0] as number) - low, upturn: (e[e.length - 1] as number) - low };
    });
}
