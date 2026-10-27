/**
 * Obstacles: solid regions with no shade (ADR 0015; beyond the spec, for the page's design D2).
 *
 * A host page marks its content (a name, a block of text) as obstacles, and the forest grows
 * around them. Unlike walls (M3), an obstacle casts no shade: the light field ignores it, so the
 * ground beneath stays lit and crowns grow right up to its edges. Two rules:
 *  - Growth: a shoot stops before a metamer whose tip would lie inside an obstacle; if its first
 *    metamer is blocked, the bud keeps resting and tries again next season.
 *  - Clearance: at the start of each season (§6 Phase 1, before the light field), and again at
 *    the end of each tree's pass (after R3 mechanics, which can sag a limb into one), any metamer
 *    whose tip lies inside an obstacle is shed with its subtree, leaving a scar, as C5 sheds. A
 *    tree whose first metamer is inside dies. So no season ends with wood inside an obstacle,
 *    and when the page's layout changes, the forest is pruned and regrows around the new shapes.
 * Rectangles are in cells; on a periodic world x wraps.
 *
 * Params: world.obstacles (optional; none by default, which changes nothing), world.sides.
 */

import type { Params } from "../params.ts";
import { ensureUint8 } from "../soa.ts";
import type { Tree } from "../tree.ts";
import { removeBranches } from "./c5-shedding.ts";

/** True when (x, y) lies inside one of `params.world.obstacles` (x wrapped on a ring). */
export function insideObstacle(params: Params, x: number, y: number): boolean {
  const obstacles = params.world.obstacles;
  if (!obstacles || obstacles.length === 0) return false;
  const W = params.world.width;
  const periodic = params.world.sides === "periodic";
  for (const o of obstacles) {
    if (y < o.y || y >= o.y + o.height) continue;
    let dx = x - o.x;
    if (periodic) dx = ((dx % W) + W) % W;
    if (dx >= 0 && dx < o.width) return true;
  }
  return false;
}

/**
 * Clearance: sheds every branch whose tip lies inside an obstacle. Returns the metamers removed;
 * kills the tree (alive = false) if its first metamer is inside. Per-row arrays in `carry` are
 * compacted alongside (after mechanics: the stress the snapshot colours by).
 */
export function clearObstacles(tree: Tree, params: Params, carry: Float64Array[] = []): number {
  const obstacles = params.world.obstacles;
  if (!obstacles || obstacles.length === 0) return 0;
  const nm = tree.m.length;
  if (nm === 0) return 0;
  if (insideObstacle(params, tree.tipX(0), tree.tipY(0))) {
    tree.alive = false;
    return 0;
  }
  tree.scratchU = ensureUint8(tree.scratchU, Math.max(nm, tree.b.length));
  const dead = tree.scratchU;
  dead.fill(0, 0, nm);
  let any = false;
  const parent = tree.m.cols.parent;
  for (let i = 1; i < nm; i++) {
    // Mark the first metamer inside along each path; removeBranches takes its subtree with it.
    const p = parent[i] as number;
    if (dead[p]) continue;
    if (insideObstacle(params, tree.tipX(i), tree.tipY(i))) {
      dead[i] = 1;
      any = true;
    }
  }
  return any ? removeBranches(tree, dead, params, carry) : 0;
}
