/**
 * Level 0's measurements of one tree (reference-fidelity plan, phase 2; analysis/fit/sources/tallo-level0.json
 * `meta.measurement`), in metres, as Tallo's field crews measure them and as phase 1 reads a tree:
 *
 * - dbh: phase 1's rule (analysis/treesim/cylinders.py `dbh`, ported line for line; the parity test is
 *   analysis/tests/test_level0_parity.py): the trunk is the continuation chain from the root, each node continued by
 *   the child with the larger subtree wood volume (within TIE, the smaller turn from the parent's axis, then the
 *   lower index), and DBH is 2 × the radius of the trunk cylinder whose span holds 1.3 m of stem length. Wood only,
 *   no bark: the same bias as Level 1's size matching.
 * - height: the highest point of any metamer above the root's base (cylinders.py `height`).
 * - crownRadius: the mean over ±x and ±z of the largest offset of a live-bud metamer's tip from the trunk's point at
 *   1.3 m (the field's mean of crown radii; the user, 2026-11-03). `maxOffset` is reported for the seam check: the
 *   stand's ring is 84 cells, so an offset of half that would mean a wrapped coordinate.
 * - codominant: whether the trunk, below its DBH cylinder, has a side child holding at least half the continuing
 *   child's subtree volume: a fork Tallo would have pooled as √Σd² (multi-stem); counted, never pooled.
 *
 * Plain columns in, so a synthetic tree tests it without the core. Cells are 0.25 m (decision 5).
 */

export const CELL = 0.25;
export const BREAST_HEIGHT = 1.3;
/** cylinders.py's TIE: subtree volumes within this relative difference are a tie. */
export const TIE = 1e-12;
/** A side child with at least this share of the continuing child's subtree volume is a codominant stem. */
export const CODOMINANT = 0.5;
const LIVE = new Set([1, 2, 5]); // BudState active, dormant, shortShoot (c3.rs `is_live_bud`)

export interface Columns {
  parent: ArrayLike<number>;
  baseX: ArrayLike<number>;
  baseY: ArrayLike<number>;
  baseZ: ArrayLike<number>;
  hx: ArrayLike<number>;
  hy: ArrayLike<number>;
  hz: ArrayLike<number>;
  length: ArrayLike<number>;
  radius: ArrayLike<number>;
}

export interface Buds {
  metamer: ArrayLike<number>;
  state: ArrayLike<number>;
}

export interface Allometry {
  dbh: number;
  height: number;
  crownRadius: number;
  maxOffset: number;
  codominant: boolean;
}

const at = (xs: ArrayLike<number>, i: number): number => xs[i] as number;

/** Each metamer's continuing child (-1 at a tip), as cylinders.py `continuation`. */
export function continuation(m: Columns): Int32Array {
  const n = m.length.length;
  const vol = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = at(m.radius, i) * CELL;
    vol[i] = Math.PI * r * r * (at(m.length, i) * CELL);
  }
  for (let i = n - 1; i > 0; i--) vol[at(m.parent, i)] += vol[i] as number;
  const dot = (a: number, b: number): number =>
    at(m.hx, a) * at(m.hx, b) + at(m.hz, a) * at(m.hz, b) + at(m.hy, a) * at(m.hy, b);
  const nxt = new Int32Array(n).fill(-1);
  for (let i = 1; i < n; i++) {
    const p = at(m.parent, i);
    const best = nxt[p] as number;
    if (best < 0) {
      nxt[p] = i;
      continue;
    }
    const vb = vol[best] as number;
    const vk = vol[i] as number;
    if (Math.abs(vk - vb) <= TIE * Math.max(vk, vb)) {
      if (dot(i, p) > dot(best, p)) nxt[p] = i;
    } else if (vk > vb) {
      nxt[p] = i;
    }
  }
  return nxt;
}

function subtreeVolume(m: Columns): Float64Array {
  const n = m.length.length;
  const vol = new Float64Array(n);
  for (let i = 0; i < n; i++) vol[i] = at(m.radius, i) ** 2 * at(m.length, i);
  for (let i = n - 1; i > 0; i--) vol[at(m.parent, i)] += vol[i] as number;
  return vol;
}

export function allometry(m: Columns, b: Buds): Allometry {
  const n = m.length.length;
  if (n === 0) return { dbh: 0, height: 0, crownRadius: 0, maxOffset: 0, codominant: false };
  const nxt = continuation(m);
  // The trunk and the cylinder whose span holds 1.3 m of stem length (np.searchsorted, side left).
  const chain = [0];
  while ((nxt[chain[chain.length - 1] as number] as number) >= 0) {
    chain.push(nxt[chain[chain.length - 1] as number] as number);
  }
  let along = 0;
  let k = chain.length - 1;
  let before = 0;
  for (let j = 0; j < chain.length; j++) {
    before = along;
    along += at(m.length, chain[j] as number) * CELL;
    if (along >= BREAST_HEIGHT) {
      k = j;
      break;
    }
  }
  const bh = chain[k] as number;
  const dbh = 2 * at(m.radius, bh) * CELL;

  // Height: the highest start or tip above the root's base, as cylinders.py reads the converted table.
  let top = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const y0 = at(m.baseY, i) * CELL;
    const y1 = y0 + at(m.hy, i) * (at(m.length, i) * CELL);
    top = Math.max(top, y0, y1);
  }
  const height = top - at(m.baseY, 0) * CELL;

  // The trunk's point at 1.3 m of stem length (its end, if the stem is shorter).
  const s = Math.min(Math.max(BREAST_HEIGHT - before, 0), at(m.length, bh) * CELL) / CELL;
  const sx = at(m.baseX, bh) + at(m.hx, bh) * s;
  const sz = at(m.baseZ, bh) + at(m.hz, bh) * s;
  const ext = [0, 0, 0, 0]; // +x, −x, +z, −z, cells
  let maxOffset = 0;
  const seen = new Uint8Array(n);
  for (let j = 0; j < b.state.length; j++) {
    if (!LIVE.has(at(b.state, j))) continue;
    const i = at(b.metamer, j);
    if (i < 0 || seen[i]) continue;
    seen[i] = 1;
    const dx = at(m.baseX, i) + at(m.hx, i) * at(m.length, i) - sx;
    const dz = at(m.baseZ, i) + at(m.hz, i) * at(m.length, i) - sz;
    ext[0] = Math.max(ext[0] as number, dx);
    ext[1] = Math.max(ext[1] as number, -dx);
    ext[2] = Math.max(ext[2] as number, dz);
    ext[3] = Math.max(ext[3] as number, -dz);
    maxOffset = Math.max(maxOffset, Math.abs(dx), Math.abs(dz));
  }
  const crownRadius = ((ext[0] + ext[1] + ext[2] + ext[3]) / 4) * CELL;

  // A codominant stem below the DBH cylinder: a side child of a trunk node before it holding ≥ half the volume.
  const vol = subtreeVolume(m);
  const onTrunk = new Uint8Array(n);
  for (let j = 0; j <= k; j++) onTrunk[chain[j] as number] = 1;
  let codominant = false;
  for (let i = 1; i < n && !codominant; i++) {
    const p = at(m.parent, i);
    if (!onTrunk[p] || p === bh || nxt[p] === i) continue;
    codominant = (vol[i] as number) >= CODOMINANT * (vol[nxt[p] as number] as number);
  }
  return { dbh, height, crownRadius, maxOffset: maxOffset * CELL, codominant };
}
