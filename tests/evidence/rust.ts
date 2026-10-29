/**
 * The evidence tests (once src/core/*.test.ts) run on the Rust core (I1, ADR 0024). Their
 * thresholds were set on the TypeScript core's runs and re-derived on this build (2026-10-30
 * production-thresholds note). This shim gives them the names
 * the TypeScript core had: `new World(params)`, `treeMetrics`, `groundLight`, `hashWorld`.
 */
import { readFileSync } from "node:fs";
import type { Params } from "../../src/core/params.ts";
import { BudState, type TreeMetrics } from "../../src/core/types.ts";
import { coreWasm, loadWorldsSync, RustWorld, type TreeView } from "../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));

export type Tree = TreeView;
export type { TreeMetrics };

/** `new World(params)`: a Rust world. */
export class World extends RustWorld {
  constructor(params: Params) {
    super(RustWorld.create(params).core());
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
    list.push(elevation(c.angle[i] as number));
    axes.set(c.axis[i] as number, list);
  }
  return [...axes.values()]
    .filter((e) => e.length >= 10)
    .map((e) => {
      const low = Math.min(...e);
      return { droop: (e[0] as number) - low, upturn: (e[e.length - 1] as number) - low };
    });
}
