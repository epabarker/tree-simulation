/**
 * Per-season snapshots for the renderer. Flat arrays over every live tree's metamers, trees
 * concatenated in id order, each tree's rows parent-before-child, so one forward loop can
 * rebuild positions from angles and lengths (how the renderer tweens between seasons).
 *
 * `prevIndex` maps each metamer to its row in the previous snapshot (-1 if new); rows of the
 * previous snapshot that nothing maps to were shed. Built in the worker; every array's buffer
 * is transferred to the main thread without copying.
 */

import { type TreeMetrics, treeMetrics } from "./metrics.ts";
import type { Wall } from "./params.ts";
import { isLiveBud } from "./principles/c3-allocation.ts";
import { junctionExponents } from "./principles/c6-girth.ts";
import type { F32, I32, U8 } from "./soa.ts";
import type { World } from "./world.ts";

export interface Snapshot {
  season: number;
  width: number;
  height: number;
  metamerCount: number;
  /** Row of the parent metamer in this snapshot, -1 for a root. */
  parent: I32;
  /** Base position: used for roots; other rows start at their parent's tip. */
  x0: F32;
  y0: F32;
  angle: F32;
  length: F32;
  radius: F32;
  tree: I32;
  birthId: I32;
  order: U8;
  /** Light per metamer of the subtree, Q_sum / n_b (colour by light). */
  light: F32;
  /** Resource arriving at the metamer's base this season (colour by v). */
  resource: F32;
  /** Seasons since the metamer formed (colour by age). */
  age: F32;
  /** Bending stress at the base over σ_target (R3; 0 when R3 is off). */
  stress: F32;
  prevIndex: I32;
  budCount: number;
  /** Row of the metamer whose upper node holds the bud. */
  budMetamer: I32;
  budState: U8;
  budQ: F32;
  /** Shadow per cell (row-major, row 0 at the ground), or null when C2 is off. */
  shadow: F32 | null;
  walls: Wall[];
  /** Leonardo exponent Δ at every junction of every live tree (C6 on), for the histogram. */
  junctions: F32;
  metrics: TreeMetrics[];
  /** Milliseconds the worker spent on the season(s) behind this snapshot. */
  seasonMs: number;
}

export function transferables(s: Snapshot): ArrayBuffer[] {
  const arrays = [
    s.parent,
    s.x0,
    s.y0,
    s.angle,
    s.length,
    s.radius,
    s.tree,
    s.birthId,
    s.order,
    s.light,
    s.resource,
    s.age,
    s.stress,
    s.prevIndex,
    s.budMetamer,
    s.budState,
    s.budQ,
    s.junctions,
  ];
  if (s.shadow) arrays.push(s.shadow);
  return arrays.map((a) => a.buffer);
}

export class SnapshotBuilder {
  private prevTree: I32 = new Int32Array(0);
  private prevBirth: I32 = new Int32Array(0);

  reset(): void {
    this.prevTree = new Int32Array(0);
    this.prevBirth = new Int32Array(0);
  }

  build(world: World, seasonMs: number): Snapshot {
    const live = world.trees.filter((t) => t.alive);
    let nm = 0;
    let nb = 0;
    for (const t of live) {
      nm += t.m.length;
      nb += t.b.length;
    }
    const s: Snapshot = {
      season: world.season,
      width: world.params.world.width,
      height: world.params.world.height,
      metamerCount: nm,
      parent: new Int32Array(nm),
      x0: new Float32Array(nm),
      y0: new Float32Array(nm),
      angle: new Float32Array(nm),
      length: new Float32Array(nm),
      radius: new Float32Array(nm),
      tree: new Int32Array(nm),
      birthId: new Int32Array(nm),
      order: new Uint8Array(nm),
      light: new Float32Array(nm),
      resource: new Float32Array(nm),
      age: new Float32Array(nm),
      stress: new Float32Array(nm),
      prevIndex: new Int32Array(nm),
      budCount: 0,
      budMetamer: new Int32Array(nb),
      budState: new Uint8Array(nb),
      budQ: new Float32Array(nb),
      shadow: null,
      walls: world.params.c2.enabled ? world.params.world.walls : [],
      junctions: new Float32Array(
        world.params.c6.enabled ? live.flatMap((t) => junctionExponents(t)) : [],
      ),
      metrics: live.map((t) => treeMetrics(t, world)),
      seasonMs,
    };

    let offset = 0;
    let k = 0;
    const mechanics = world.params.r3.enabled;
    for (const t of live) {
      const c = t.m.cols;
      for (let i = 0; i < t.m.length; i++) {
        const j = offset + i;
        s.parent[j] = c.parent[i] >= 0 ? offset + c.parent[i] : -1;
        s.x0[j] = c.baseX[i];
        s.y0[j] = c.baseY[i];
        s.angle[j] = c.angle[i];
        s.length[j] = c.length[i];
        s.radius[j] = c.radius[i];
        s.tree[j] = t.id;
        s.birthId[j] = c.birthId[i];
        s.order[j] = c.order[i];
        s.light[j] = c.nSum[i] > 0 ? c.qSum[i] / c.nSum[i] : 0;
        s.resource[j] = c.vIn[i];
        s.age[j] = world.season - c.birthSeason[i];
        s.stress[j] = mechanics && i < t.stress.length ? t.stress[i] : 0;
      }
      const b = t.b.cols;
      for (let i = 0; i < t.b.length; i++) {
        if (!isLiveBud(b.state[i])) continue;
        s.budMetamer[k] = offset + b.metamer[i];
        s.budState[k] = b.state[i];
        s.budQ[k] = b.q[i];
        k++;
      }
      offset += t.m.length;
    }
    s.budCount = k;

    const field = world.light.field();
    if (field) s.shadow = Float32Array.from(field);

    this.linkPrevious(s);
    return s;
  }

  /**
   * Fills prevIndex by merging birthIds tree by tree. Within a tree, birthIds ascend in array
   * order (append-only tables, order-keeping compaction), so a two-pointer walk suffices.
   */
  private linkPrevious(s: Snapshot): void {
    const ranges = new Map<number, [number, number]>();
    const pt = this.prevTree;
    for (let i = 0; i < pt.length; ) {
      let e = i;
      while (e < pt.length && pt[e] === pt[i]) e++;
      ranges.set(pt[i], [i, e]);
      i = e;
    }
    const pb = this.prevBirth;
    for (let i = 0; i < s.metamerCount; ) {
      const tree = s.tree[i];
      let e = i;
      while (e < s.metamerCount && s.tree[e] === tree) e++;
      const range = ranges.get(tree);
      let p = range ? range[0] : 0;
      const pEnd = range ? range[1] : 0;
      for (let j = i; j < e; j++) {
        const id = s.birthId[j];
        while (p < pEnd && pb[p] < id) p++;
        s.prevIndex[j] = p < pEnd && pb[p] === id ? p : -1;
      }
      i = e;
    }
    this.prevTree = s.tree.slice();
    this.prevBirth = s.birthId.slice();
  }
}
