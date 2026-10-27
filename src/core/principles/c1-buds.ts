/**
 * C1. Metamer structure, bud fate and 2D side sequence (spec §C1).
 *
 * A tree is a graph of metamers (internode, leaf, buds). All growth happens at buds. New
 * axillary buds get a side from the distichous sequence s_k = s0·(−1)^k [RNG: sideSequence,
 * keyed by axis], so successive nodes of an axis alternate left and right.
 *
 * Params: c1.branchAngle (β), c1.internodeLength (l0), c1.maxMetamersPerShoot, c6.r0; with R2
 * the r2.levels generator, β and p_term (r2-physiological-age.ts).
 *
 * Column arrays are re-read after every `add()`, which may reallocate them.
 */

import { DEG, type Params } from "../params.ts";
import { Purpose, sign } from "../rng.ts";
import { BudState, Slot, type Tree } from "../tree.ts";
import { branchAngleOf, lateralCount, terminates } from "./r2-physiological-age.ts";

/** Appends a metamer at `slot` of `parent`'s upper node (parent -1 = root). Returns its index. */
export function addMetamer(
  tree: Tree,
  parent: number,
  slot: Slot,
  angle: number,
  length: number,
  radius: number,
  season: number,
): number {
  const i = tree.m.add();
  const c = tree.m.cols;
  const id = tree.nextMetamerId++;
  c.birthId[i] = id;
  c.parent[i] = parent;
  c.slot[i] = slot;
  if (parent < 0) {
    c.axis[i] = id;
    c.axisNode[i] = 0;
    c.order[i] = 0;
    c.baseX[i] = tree.rootX;
    c.baseY[i] = 0;
  } else {
    if (slot === Slot.main) {
      c.axis[i] = c.axis[parent];
      c.axisNode[i] = c.axisNode[parent] + 1;
      c.order[i] = c.order[parent];
    } else {
      c.axis[i] = id;
      c.axisNode[i] = 0;
      c.order[i] = c.order[parent] + 1;
    }
    c.baseX[i] = tree.tipX(parent);
    c.baseY[i] = tree.tipY(parent);
  }
  c.angle[i] = angle;
  c.length[i] = length;
  c.radius[i] = radius;
  c.scarSumN[i] = 0;
  c.stressWood[i] = 0;
  c.moment[i] = 0;
  c.birthSeason[i] = season;
  return i;
}

/** Appends a bud at `slot` of metamer `m`'s upper node. Returns its index. */
export function addBud(tree: Tree, m: number, slot: Slot, angle: number, order: number): number {
  const i = tree.b.add();
  const c = tree.b.cols;
  c.birthId[i] = tree.nextBudId++;
  c.metamer[i] = m;
  c.slot[i] = slot;
  c.state[i] = BudState.active;
  c.age[i] = 0;
  c.order[i] = order;
  c.angle[i] = angle;
  return i;
}

/**
 * Forms the axillary bud(s) of metamer `m` from the side sequence (§C1.4). Distichous: one bud
 * per node, side s_k = s0·(−1)^k where k is the node's position on its axis. With R2 the axis's
 * generator may place a bud on both sides (opposite, whorled tiers) or none (ADR 0009);
 * `lastOfShoot` marks the last metamer of this season's shoot, where whorled tiers form.
 * Side −1 is the left slot (direction rotated by +β), side +1 the right slot (−β).
 */
export function formAxillaryBuds(tree: Tree, m: number, params: Params, lastOfShoot = true): void {
  const c = tree.m.cols;
  const k = c.axisNode[m];
  const count = lateralCount(c.order[m], k, lastOfShoot, params.r2);
  if (count === 0) return;
  const order = c.order[m] + 1;
  const beta = branchAngleOf(order, params) * DEG;
  const angle = c.angle[m];
  if (count === 2) {
    addBud(tree, m, Slot.left, angle + beta, order);
    addBud(tree, m, Slot.right, angle - beta, order);
    return;
  }
  const s0 = sign(params.seed, Purpose.sideSequence, tree.id, c.axis[m], 0);
  const side = k % 2 === 0 ? s0 : -s0;
  if (side < 0) addBud(tree, m, Slot.left, angle + beta, order);
  else addBud(tree, m, Slot.right, angle - beta, order);
}

/**
 * Forms the terminal bud of metamer `m`, continuing its axis in the same direction. With R2 it
 * ends (terminated, sympodial growth) with probability p_term of the axis's pa.
 */
export function formTerminalBud(tree: Tree, m: number, params: Params, season: number): void {
  const c = tree.m.cols;
  const i = addBud(tree, m, Slot.main, c.angle[m], c.order[m]);
  if (terminates(c.order[m], tree.id, c.birthId[m], season, params)) {
    tree.b.cols.state[i] = BudState.terminated;
  }
}

/** Plants a seedling: one vertical metamer with its terminal and axillary buds. */
export function plantSeedling(tree: Tree, params: Params, season: number): void {
  const m = addMetamer(
    tree,
    -1,
    Slot.main,
    Math.PI / 2,
    params.c1.internodeLength,
    params.c6.r0,
    season,
  );
  formTerminalBud(tree, m, params, season);
  formAxillaryBuds(tree, m, params);
}

/**
 * Number of metamers and internode length for a bud receiving resource v (§C3.4, ADR 0004).
 * The resource is capped first, v' = min(v, c1.maxMetamersPerShoot), then Palubicki et al.'s
 * rule applies unchanged: n = ⌊v'⌋ and l = v'/n in units of l0, so l stays within [1, 2)·l0 and
 * resource above the cap is lost (as in the LPFG SOT model's MAXGROW). Writes the length into
 * `out` and returns n (0 = no growth).
 */
export function shootSize(v: number, params: Params, out: { length: number }): number {
  const capped = Math.min(v, params.c1.maxMetamersPerShoot);
  const n = Math.floor(capped);
  if (n < 1) {
    out.length = 0;
    return 0;
  }
  out.length = (capped / n) * params.c1.internodeLength;
  return n;
}

/**
 * Directs one new metamer. `prev` is the default direction (the bud's, then the previous
 * metamer's). C4 replaces this with its weighted sum when enabled.
 */
export type DirectionFn = (prev: number, bud: number, metamerBirthId: number) => number;

/**
 * Grows a shoot of `n` metamers of length `length` from `bud` (§C1, §C3.4). The bud is consumed;
 * each new metamer forms its axillary bud(s), and the last one forms the terminal bud.
 */
export function growShoot(
  tree: Tree,
  bud: number,
  n: number,
  length: number,
  params: Params,
  season: number,
  direct: DirectionFn,
): void {
  const b = tree.b.cols;
  let parent = b.metamer[bud];
  let slot = b.slot[bud] as Slot;
  let angle = b.angle[bud];
  b.state[bud] = BudState.gone;
  for (let j = 0; j < n; j++) {
    angle = direct(angle, bud, tree.nextMetamerId);
    const m = addMetamer(tree, parent, slot, angle, length, params.c6.r0, season);
    formAxillaryBuds(tree, m, params, j === n - 1);
    if (j === n - 1) formTerminalBud(tree, m, params, season);
    parent = m;
    slot = Slot.main;
  }
}
