/**
 * THROWAWAY PROTOTYPE (3D port, before G2; review §5, user 2026-10-29). Not the model. Not
 * calibrated. No keyed-hash RNG, no goldens, no principle toggles. Delete once ADR 0024 is decided.
 *
 * Trees that grow in 3D in an open slab W × H × D: the ring in x, open sky in front and behind,
 * buds beyond a face get Q = 0 (the closed-box rule), light passes freely. Optionally Q fades to 0
 * over the last `fade` cells before each face.
 *
 * What is 3D here, and new: bud placement (C1: one lateral per node, azimuths stepping by a
 * divergence angle, 137.5° spiral or 180° distichous), shoot direction (C4 as a vector sum),
 * light (C2: cli/slab-light.ts SlabSweep, the measured row march). Everything else is the 2D core
 * itself, imported, not copied, so nothing drifts: C3 (gatherLight, allocate with Borchert–Honda),
 * R1 (carbonBalance, starvedToDeath), C5 (crownTopLight, shedBranches), C6 (updateGirth), and the
 * Tree and its tables. A tree's tables are the core's schemas widened by 3D columns (z, a
 * direction vector), so the core's compaction carries them.
 *
 * The 2D columns are kept meaningful for the imported passes: baseX/baseY are the 3D base's x and
 * y, length is the true 3D length, and angle = asin(dy), so the core's tipY (R1's height) is the
 * 3D tip's y. Nothing imported reads tipX.
 */

import { SlabSweep } from "../../../../cli/slab-light.ts";
import type { Params } from "../../../../src/core/params.ts";
import { DEG } from "../../../../src/core/params.ts";
import { addBud, addMetamer, shootSize } from "../../../../src/core/principles/c1-buds.ts";
import { allocate, gatherLight, isLiveBud } from "../../../../src/core/principles/c3-allocation.ts";
import { crownTopLight, shedBranches } from "../../../../src/core/principles/c5-shedding.ts";
import { updateGirth } from "../../../../src/core/principles/c6-girth.ts";
import { carbonBalance, starvedToDeath } from "../../../../src/core/principles/r1-carbon.ts";
import { depositArea, restingState } from "../../../../src/core/principles/r6-short-shoots.ts";
import { Table } from "../../../../src/core/soa.ts";
import { BUD_SCHEMA, BudState, METAMER_SCHEMA, Slot, Tree } from "../../../../src/core/tree.ts";

export const M3_SCHEMA = {
  ...METAMER_SCHEMA,
  z0: Float64Array,
  dx: Float64Array,
  dy: Float64Array,
  dz: Float64Array,
  /** The axis's first azimuth (radians); node k's lateral sits at phase + k·divergence. */
  phase: Float64Array,
} as const;
export const B3_SCHEMA = {
  ...BUD_SCHEMA,
  dx: Float64Array,
  dy: Float64Array,
  dz: Float64Array,
  vz: Float64Array,
} as const;
type M3 = { [K in keyof typeof M3_SCHEMA]: InstanceType<(typeof M3_SCHEMA)[K]> };
type B3 = { [K in keyof typeof B3_SCHEMA]: InstanceType<(typeof B3_SCHEMA)[K]> };
export const mc = (t: Tree) => t.m.cols as unknown as M3;
export const bc = (t: Tree) => t.b.cols as unknown as B3;

export interface Options {
  D: number;
  /** Cells over which Q fades to 0 before each face (0: hard faces). */
  fade: number;
  /** Divergence angle between successive laterals of an axis, degrees (137.5 spiral, 180 distichous). */
  divergence: number;
  K: number;
  seed: number;
}

/** mulberry32: the prototype's only randomness (direction noise, axis phases). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

/** A unit vector perpendicular to d (d unit): horizontal where possible. */
function perp(dx: number, dy: number, dz: number): [number, number, number] {
  // u = normalize(d × up), up = (0, 1, 0); for a vertical d use x.
  let ux = -dz;
  let uy = 0;
  let uz = dx;
  let n = Math.hypot(ux, uz);
  if (n < 1e-6) {
    ux = 1;
    uz = 0;
    n = 1;
  }
  ux /= n;
  uz /= n;
  return [ux, uy, uz];
}

/** d rotated by angle b toward azimuth phi about d (phi measured from perp(d) around d). */
function tilt(dx: number, dy: number, dz: number, b: number, phi: number): [number, number, number] {
  const [ux, uy, uz] = perp(dx, dy, dz);
  // w = d × u
  const wx = dy * uz - dz * uy;
  const wy = dz * ux - dx * uz;
  const wz = dx * uy - dy * ux;
  const ax = Math.cos(phi) * ux + Math.sin(phi) * wx;
  const ay = Math.cos(phi) * uy + Math.sin(phi) * wy;
  const az = Math.cos(phi) * uz + Math.sin(phi) * wz;
  const c = Math.cos(b);
  const s = Math.sin(b);
  return [c * dx + s * ax, c * dy + s * ay, c * dz + s * az];
}

export class Stand3D {
  readonly params: Params;
  readonly o: Options;
  readonly light: SlabSweep;
  readonly trees: Tree[] = [];
  season = 0;
  private readonly r: () => number;
  private readonly out = new Float64Array(4);
  /** Milliseconds per phase, summed over seasons. */
  readonly ms = { light: 0, passes: 0 };

  constructor(params: Params, o: Options) {
    this.params = params;
    this.o = o;
    this.r = rng(o.seed);
    const { width: W, height: H } = params.world;
    this.light = new SlabSweep(W, H, o.D, params.c2, o.K, true, false, Float32Array, true);
    params.trees.forEach((spec, id) => {
      const t = new Tree(id, spec.x);
      // Widen the core's tables with the 3D columns (runtime only; the core never sees the type).
      (t as unknown as { m: unknown }).m = new Table(M3_SCHEMA, 256);
      (t as unknown as { b: unknown }).b = new Table(B3_SCHEMA, 256);
      this.plant(t);
      this.trees.push(t);
    });
  }

  private plant(t: Tree): void {
    const p = this.params;
    const i = addMetamer(t, -1, Slot.main, Math.PI / 2, p.c1.internodeLength, p.c6.r0, 0);
    const m = mc(t);
    m.z0[i] = this.o.D / 2;
    m.dx[i] = 0;
    m.dy[i] = 1;
    m.dz[i] = 0;
    m.phase[i] = 2 * Math.PI * this.r();
    this.lateral(t, i);
    this.terminal(t, i);
  }

  tip(t: Tree, i: number): [number, number, number] {
    const m = mc(t);
    const l = m.length[i] as number;
    return [
      (m.baseX[i] as number) + l * (m.dx[i] as number),
      (m.baseY[i] as number) + l * (m.dy[i] as number),
      (m.z0[i] as number) + l * (m.dz[i] as number),
    ];
  }

  private lateral(t: Tree, i: number): void {
    const m = mc(t);
    const phi = (m.phase[i] as number) + (m.axisNode[i] as number) * this.o.divergence * DEG;
    const [x, y, z] = tilt(m.dx[i] as number, m.dy[i] as number, m.dz[i] as number, this.params.c1.branchAngle * DEG, phi);
    const j = addBud(t, i, Slot.left, Math.asin(Math.max(-1, Math.min(1, y))), (m.order[i] as number) + 1);
    const b = bc(t);
    b.dx[j] = x;
    b.dy[j] = y;
    b.dz[j] = z;
  }

  private terminal(t: Tree, i: number): void {
    const m = mc(t);
    const j = addBud(t, i, Slot.main, m.angle[i] as number, m.order[i] as number);
    const b = bc(t);
    b.dx[j] = m.dx[i] as number;
    b.dy[j] = m.dy[i] as number;
    b.dz[j] = m.dz[i] as number;
  }

  /** Q with the face fade: 1 inside, falling linearly to 0 over the last `fade` cells. */
  private faceFactor(z: number): number {
    const f = this.o.fade;
    if (f <= 0) return 1;
    const d = Math.min(z, this.o.D - z);
    return d >= f ? 1 : Math.max(0, d / f);
  }

  /** C4 in 3D: d = normalize(w_d·d_prev + ξ·V + η·t(A_set) + ε·u). */
  private direct(dx: number, dy: number, dz: number, vx: number, vy: number, vz: number): [number, number, number] {
    const c4 = this.params.c4;
    if (!c4.enabled) return [dx, dy, dz];
    let hx = dx;
    let hz = dz;
    const h = Math.hypot(hx, hz);
    if (h < 1e-9) {
      hx = 1;
      hz = 0;
    } else {
      hx /= h;
      hz /= h;
    }
    const a = c4.setPoint * DEG;
    const tx = Math.sin(a) * hx;
    const ty = Math.cos(a);
    const tz = Math.sin(a) * hz;
    // u: d_prev turned by N(0, σ²) about a random axis perpendicular to it.
    const [ux, uy, uz] = tilt(dx, dy, dz, c4.sigma * DEG * gauss(this.r), 2 * Math.PI * this.r());
    let x = c4.wd * dx + c4.xi * vx + c4.eta * tx + c4.epsilon * ux;
    let y = c4.wd * dy + c4.xi * vy + c4.eta * ty + c4.epsilon * uy;
    let z = c4.wd * dz + c4.xi * vz + c4.eta * tz + c4.epsilon * uz;
    const n = Math.hypot(x, y, z);
    if (n === 0) return [dx, dy, dz];
    x /= n;
    y /= n;
    z /= n;
    return [x, y, z];
  }

  /** One shoot of n metamers from bud `bud` (as core growShoot, in 3D). */
  private grow(t: Tree, bud: number, n: number, length: number): void {
    const b = bc(t);
    let parent = b.metamer[bud] as number;
    let slot = b.slot[bud] as Slot;
    let [dx, dy, dz] = [b.dx[bud] as number, b.dy[bud] as number, b.dz[bud] as number];
    const [vx, vy, vz] = [b.vx[bud] as number, b.vy[bud] as number, b.vz[bud] as number];
    b.state[bud] = BudState.gone;
    let last = -1;
    for (let k = 0; k < n; k++) {
      [dx, dy, dz] = this.direct(dx, dy, dz, vx, vy, vz);
      const [x0, y0, z0] = this.tip(t, parent);
      const i = addMetamer(t, parent, slot, Math.asin(Math.max(-1, Math.min(1, dy))), length, this.params.c6.r0, this.season);
      const m = mc(t);
      m.baseX[i] = x0;
      m.baseY[i] = y0;
      m.z0[i] = z0;
      m.dx[i] = dx;
      m.dy[i] = dy;
      m.dz[i] = dz;
      m.phase[i] = slot === Slot.main ? (m.phase[parent] as number) : 2 * Math.PI * this.r();
      this.lateral(t, i);
      parent = i;
      slot = Slot.main;
      last = i;
    }
    if (last >= 0) this.terminal(t, last);
  }

  step(): void {
    const p = this.params;
    const live = this.trees.filter((t) => t.alive);
    const t0 = performance.now();
    // Phase 1 (C2): every live bud's foliage into the slab, then the sweep.
    this.light.clear();
    for (const t of live) {
      const b = bc(t);
      for (let i = 0; i < t.b.length; i++) {
        if (!isLiveBud(b.state[i] as number)) continue;
        const [x, y, z] = this.tip(t, b.metamer[i] as number);
        this.light.deposit(x, y, z, depositArea(b.state[i] as number, p.r6));
      }
    }
    this.light.compute();
    const t1 = performance.now();
    // Phase 2: per tree, as the core's runSeason with R2–R6 off.
    const shoot = { length: 0 };
    for (const t of live) {
      t.ensureScratch();
      t.shedCount = 0;
      const b = bc(t);
      for (let i = 0; i < t.b.length; i++) {
        if (!isLiveBud(b.state[i] as number)) continue;
        const [x, y, z] = this.tip(t, b.metamer[i] as number);
        this.light.sample(x, y, z, this.out);
        b.q[i] = (this.out[0] as number) * this.faceFactor(z);
        b.vx[i] = this.out[1] as number;
        b.vy[i] = this.out[2] as number;
        b.vz[i] = this.out[3] as number;
      }
      if (p.c5.Trel > 0) t.qTop = crownTopLight(t, p.c5.topQuantile);
      gatherLight(t, p.r6);
      if (p.r1.enabled) carbonBalance(t, p);
      allocate(t, p);
      const evaluated = t.m.length;
      const count = t.b.length;
      for (let i = 0; i < count; i++) {
        const bb = bc(t);
        if (!isLiveBud(bb.state[i] as number)) continue;
        const n = (bb.v[i] as number) >= 1 ? shootSize(bb.v[i] as number, p, shoot) : 0;
        if (n > 0) this.grow(t, i, n, shoot.length);
        else {
          bb.state[i] = restingState(bb.q[i] as number, p.r6);
          bb.age[i] = (bb.age[i] as number) + 1;
        }
      }
      if (p.c5.enabled || (p.r1.enabled && p.r1.shed === "carbon")) {
        t.shedCount = shedBranches(t, p, this.season, evaluated);
      }
      if (p.c6.enabled) updateGirth(t, p);
      // Consumed buds out (the core's commitBuds is module-private; it is these lines).
      const nb = t.b.length;
      const keep = new Uint8Array(nb);
      const st = t.b.cols.state;
      for (let i = 0; i < nb; i++) keep[i] = st[i] === BudState.gone ? 0 : 1;
      t.b.compact(keep);
      t.age += 1;
    }
    for (const t of live) if (starvedToDeath(t, p.r1)) t.alive = false;
    const t2 = performance.now();
    this.ms.light += t1 - t0;
    this.ms.passes += t2 - t1;
    this.season += 1;
  }

  metamers(): number {
    return this.trees.filter((t) => t.alive).reduce((n, t) => n + t.m.length, 0);
  }
}
