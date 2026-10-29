/**
 * Scratch, for the 3D-port measurement only (docs/experiments/2026-10-29-3d-light-cost.md): the
 * sky sweep and the shadow triangle extended to a slab W × H × D. Nothing in src/ uses these;
 * `cli/bench.ts --slab …` runs one beside the real 2D light model, fed the same deposits, and
 * times it. Behaviour, goldens and the default light model are untouched.
 *
 * SlabSweep is the M18 row march in 3D. A ray (dx, dy, dz) going down one row moves by
 * (sx, sz) = (dx, dz)/dy, the same for every cell of the row, so as in 2D the offsets are split
 * once per row and the inner loops only index. G_{y+1} is read bilinearly in (x, z). The leaf
 * area crossed in the row is the mean of ℓ over the box the segment spans, from a per-plane
 * summed-area table built separably (prefix sums along x, then along z of the x-means). The box
 * mean is an approximation the 2D march does not make (in 2D the segment is the box); it costs the
 * same as the exact line integral would need and is enough to time.
 *
 * SlabPyramid is Palubicki et al. (2009) §4.1 in 3D: a bud in cell (I, J, Z) adds a·b^(−q) to the
 * (2q + 1)² cells (I ± p, J − q, Z ± p'), and V is the least-shaded cell in a cone of half-angle θ
 * and radius r, a search over (2r + 1)³ cells.
 */

import type { LightModel, LightSample } from "../src/core/light/light-model.ts";
import type { Params, Wall } from "../src/core/params.ts";

export type Arr = Float64Array | Float32Array;
export type ArrCtor = Float64ArrayConstructor | Float32ArrayConstructor;

const GOLDEN = (Math.sqrt(5) - 1) / 2;
const DEG = Math.PI / 180;

export interface SlabLight {
  readonly D: number;
  clear(): void;
  deposit(x: number, y: number, z: number, area: number): void;
  compute(): void;
  /** Writes Q into out[0] and V into out[1..3]. */
  sample(x: number, y: number, z: number, out: Float64Array): void;
  /** Cell–direction updates of the last compute (sweep), or deposit cell updates (pyramid). */
  updates: number;
}

export class SlabSweep implements SlabLight {
  readonly W: number;
  readonly H: number;
  readonly D: number;
  readonly lad: Arr;
  readonly q: Arr;
  readonly vx: Arr;
  readonly vy: Arr;
  readonly vz: Arr;
  private readonly depth: Arr;
  readonly dirX: Float64Array;
  readonly dirY: Float64Array;
  readonly dirZ: Float64Array;
  readonly weight: Float64Array;
  private readonly kExt: number;
  private readonly periodicX: boolean;
  private readonly periodicZ: boolean;
  private readonly A: ArrCtor;
  private lineA: Arr;
  private lineB: Arr;
  private padG: Arr;
  private padL: Arr;
  private padI: Arr;
  private R: Arr;
  private S: Arr;
  private top = 0;
  updates = 0;
  /** March all K directions down together, one row at a time (see computeFused). */
  readonly fused: boolean;

  constructor(
    W: number,
    H: number,
    D: number,
    c2: Params["c2"],
    K: number,
    periodicX: boolean,
    periodicZ: boolean,
    A: ArrCtor,
    fused = false,
  ) {
    this.fused = fused;
    this.W = W;
    this.H = H;
    this.D = D;
    this.A = A;
    this.periodicX = periodicX;
    this.periodicZ = periodicZ;
    const n = W * H * D;
    this.lad = new A(n);
    this.q = new A(n);
    this.vx = new A(n);
    this.vy = new A(n);
    this.vz = new A(n);
    this.depth = new A(fused ? 0 : n);
    this.lineA = new A(W * D);
    this.lineB = new A(W * D);
    this.padG = new A(0);
    this.padL = new A(0);
    this.padI = new A(0);
    this.R = new A(0);
    this.S = new A(0);
    this.kExt = c2.kExt;
    // K directions over the sky above minElevation: equal-area bands in sin(elevation), azimuth
    // stepped by the golden angle (a spherical Fibonacci set), weights ∝ sin(elevation)^p.
    this.dirX = new Float64Array(K);
    this.dirY = new Float64Array(K);
    this.dirZ = new Float64Array(K);
    this.weight = new Float64Array(K);
    const lo = Math.sin(Math.min(89, Math.max(1, c2.minElevation)) * DEG);
    let total = 0;
    for (let k = 0; k < K; k++) {
      const sinE = K === 1 ? 1 : lo + ((1 - lo) * (k + 0.5)) / K;
      const cosE = Math.sqrt(1 - sinE * sinE);
      const az = 2 * Math.PI * ((k * GOLDEN) % 1);
      this.dirX[k] = cosE * Math.cos(az);
      this.dirY[k] = sinE;
      this.dirZ[k] = cosE * Math.sin(az);
      const w = sinE ** c2.skyExponent;
      this.weight[k] = w;
      total += w;
    }
    for (let k = 0; k < K; k++) this.weight[k] = (this.weight[k] * c2.C) / total;
  }

  clear(): void {
    this.lad.fill(0, 0, this.top * this.W * this.D);
    this.top = 0;
  }

  private cell(x: number, y: number, z: number): number {
    const { W, H, D } = this;
    let I = Math.floor(x);
    let Z = Math.floor(z);
    const J = Math.floor(y);
    if (this.periodicX) I = ((I % W) + W) % W;
    if (this.periodicZ) Z = ((Z % D) + D) % D;
    if (I < 0 || I >= W || J < 0 || J >= H || Z < 0 || Z >= D) return -1;
    return (J * D + Z) * W + I;
  }

  deposit(x: number, y: number, z: number, area: number): void {
    const c = this.cell(x, y, z);
    if (c < 0) return;
    this.lad[c] += area;
    const J = Math.floor(y);
    if (J >= this.top) this.top = J + 1;
  }

  compute(): void {
    if (this.fused) {
      this.computeFused();
      return;
    }
    const { W, D, depth, q, vx, vy, vz, kExt } = this;
    const top = this.top;
    const plane = W * D;
    const n = top * plane;
    q.fill(0, 0, n);
    vx.fill(0, 0, n);
    vy.fill(0, 0, n);
    vz.fill(0, 0, n);
    let qOpen = 0;
    let vxOpen = 0;
    let vyOpen = 0;
    let vzOpen = 0;
    for (let k = 0; k < this.weight.length; k++) {
      const w = this.weight[k];
      const dx = this.dirX[k];
      const dy = this.dirY[k];
      const dz = this.dirZ[k];
      this.sweep(dx, dy, dz);
      for (let c = 0; c < n; c++) {
        const d = depth[c];
        const light = d === 0 ? w : w * Math.exp(-kExt * d);
        q[c] += light;
        vx[c] += light * dx;
        vy[c] += light * dy;
        vz[c] += light * dz;
      }
      qOpen += w;
      vxOpen += w * dx;
      vyOpen += w * dy;
      vzOpen += w * dz;
    }
    q.fill(qOpen, n);
    vx.fill(vxOpen, n);
    vy.fill(vyOpen, n);
    vz.fill(vzOpen, n);
    this.updates = this.weight.length * n;
  }

  /**
   * The same march with the loops swapped: rows outside, directions inside. Each direction keeps
   * its own G line (K × W × D), a row's ℓ is padded and prefix-summed once for all directions,
   * and the row's light is accumulated while its plane of q, v is in cache. There is no depth
   * volume and no second pass over the volume per direction.
   */
  private computeFused(): void {
    const { W, D, lad, q, vx, vy, vz, kExt, periodicX, periodicZ, A } = this;
    const K = this.weight.length;
    const top = this.top;
    const plane = W * D;
    const n = top * plane;
    let padX = 2;
    let padZ = 2;
    for (let k = 0; k < K; k++) {
      const sx = this.dirX[k] / this.dirY[k];
      const sz = this.dirZ[k] / this.dirY[k];
      padX = Math.max(padX, Math.abs(Math.floor(sx)) + 2, Math.abs(Math.floor(0.5 + sx)) + 2);
      padZ = Math.max(padZ, Math.abs(Math.floor(sz)) + 2, Math.abs(Math.floor(0.5 + sz)) + 2);
    }
    const NX = W + 2 * padX;
    const NZ = D + 2 * padZ;
    if (this.lineA.length < K * plane) {
      this.lineA = new A(K * plane);
      this.lineB = new A(K * plane);
    }
    if (this.padG.length < NX * NZ) {
      this.padG = new A(NX * NZ);
      this.padL = new A(NX * NZ);
      this.padI = new A((NX + 1) * NZ);
    }
    if (this.R.length < W * NZ) {
      this.R = new A(W * NZ);
      this.S = new A(W * (NZ + 1));
    }
    const G = this.padG;
    const L = this.padL;
    const I = this.padI;
    const R = this.R;
    const S = this.S;
    let up = this.lineA;
    let next = this.lineB;
    up.fill(0, 0, K * plane);
    q.fill(0, 0, n);
    vx.fill(0, 0, n);
    vy.fill(0, 0, n);
    vz.fill(0, 0, n);
    for (let row = top - 1; row >= 0; row--) {
      const base = row * plane;
      // This row's light from every direction: its entry depth is G on the line above.
      for (let k = 0; k < K; k++) {
        const w = this.weight[k];
        const dx = this.dirX[k];
        const dy = this.dirY[k];
        const dz = this.dirZ[k];
        const u0 = k * plane;
        for (let c = 0; c < plane; c++) {
          const d = up[u0 + c];
          const light = d === 0 ? w : w * Math.exp(-kExt * d);
          q[base + c] += light;
          vx[base + c] += light * dx;
          vy[base + c] += light * dy;
          vz[base + c] += light * dz;
        }
      }
      if (row === 0) break;
      // ℓ of this row, padded, and its prefix sums along x: shared by every direction.
      for (let zz = 0; zz < NZ; zz++) {
        let z = zz - padZ;
        if (periodicZ) z = ((z % D) + D) % D;
        const d0 = zz * NX;
        const i0 = zz * (NX + 1);
        if (z < 0 || z >= D) L.fill(0, d0, d0 + NX);
        else SlabSweep.padLine(lad, base + z * W, W, L, d0, padX, periodicX);
        let acc = 0;
        for (let j = 0; j < NX; j++) {
          I[i0 + j] = acc;
          acc += L[d0 + j];
        }
        I[i0 + NX] = acc;
      }
      for (let k = 0; k < K; k++) {
        const dy = this.dirY[k];
        const sx = this.dirX[k] / dy;
        const sz = this.dirZ[k] / dy;
        const perRow = 1 / dy;
        const kx = Math.floor(sx);
        const fx = sx - kx;
        const mx = Math.floor(0.5 + sx);
        const frx = 0.5 + sx - mx;
        const kz = Math.floor(sz);
        const fz = sz - kz;
        const mz = Math.floor(0.5 + sz);
        const frz = 0.5 + sz - mz;
        const vertX = Math.abs(sx) < 1e-9;
        const vertZ = Math.abs(sz) < 1e-9;
        const u0 = k * plane;
        for (let zz = 0; zz < NZ; zz++) {
          let z = zz - padZ;
          if (periodicZ) z = ((z % D) + D) % D;
          const d0 = zz * NX;
          if (z < 0 || z >= D) G.fill(0, d0, d0 + NX);
          else SlabSweep.padLine(up, u0 + z * W, W, G, d0, padX, periodicX);
          const i0 = zz * (NX + 1);
          const r0 = zz * W;
          if (vertX) {
            for (let col = 0; col < W; col++) R[r0 + col] = L[d0 + col + padX];
          } else {
            for (let col = 0; col < W; col++) {
              const j = col + padX;
              const from = I[i0 + j] + 0.5 * L[d0 + j];
              const to = I[i0 + j + mx] + frx * L[d0 + j + mx];
              R[r0 + col] = (to - from) / sx;
            }
          }
        }
        if (!vertZ) {
          S.fill(0, 0, W);
          for (let zz = 0; zz < NZ; zz++) {
            const s0 = zz * W;
            for (let col = 0; col < W; col++) S[s0 + W + col] = S[s0 + col] + R[s0 + col];
          }
        }
        for (let z = 0; z < D; z++) {
          const zj = z + padZ;
          const g0 = (zj + kz) * NX + padX + kx;
          const g1 = g0 + NX;
          const r = zj * W;
          const rm = (zj + mz) * W;
          const o = u0 + z * W;
          for (let col = 0; col < W; col++) {
            const g =
              (1 - fz) * (G[g0 + col] * (1 - fx) + G[g0 + col + 1] * fx) +
              fz * (G[g1 + col] * (1 - fx) + G[g1 + col + 1] * fx);
            let mean: number;
            if (vertZ) mean = R[r + col];
            else {
              const from = S[r + col] + 0.5 * R[r + col];
              const to = S[rm + col] + frz * R[rm + col];
              mean = (to - from) / sz;
            }
            next[o + col] = g + mean * perRow;
          }
        }
      }
      const t = up;
      up = next;
      next = t;
    }
    let qOpen = 0;
    let vxOpen = 0;
    let vyOpen = 0;
    let vzOpen = 0;
    for (let k = 0; k < K; k++) {
      const w = this.weight[k];
      qOpen += w;
      vxOpen += w * this.dirX[k];
      vyOpen += w * this.dirY[k];
      vzOpen += w * this.dirZ[k];
    }
    q.fill(qOpen, n);
    vx.fill(vxOpen, n);
    vy.fill(vyOpen, n);
    vz.fill(vzOpen, n);
    this.updates = K * n;
  }

  /** Copies one W-long line into a padded line of `N`, wrapping or zero-filling the pads. */
  private static padLine(
    src: Arr,
    s0: number,
    W: number,
    dst: Arr,
    d0: number,
    pad: number,
    periodic: boolean,
  ): void {
    dst.set(src.subarray(s0, s0 + W), d0 + pad);
    for (let j = 0; j < pad; j++) {
      // left pad: column j − pad; right pad: column W + j
      let cl = j - pad;
      let cr = W + j;
      if (periodic) {
        cl = ((cl % W) + W) % W;
        cr = cr % W;
        dst[d0 + j] = src[s0 + cl];
        dst[d0 + pad + W + j] = src[s0 + cr];
      } else {
        dst[d0 + j] = 0;
        dst[d0 + pad + W + j] = 0;
      }
    }
  }

  private sweep(dx: number, dy: number, dz: number): void {
    const { W, D, lad, depth, periodicX, periodicZ, top, A } = this;
    const sx = dx / dy;
    const sz = dz / dy;
    const perRow = 1 / dy;
    const kx = Math.floor(sx);
    const fx = sx - kx;
    const mx = Math.floor(0.5 + sx);
    const frx = 0.5 + sx - mx;
    const kz = Math.floor(sz);
    const fz = sz - kz;
    const mz = Math.floor(0.5 + sz);
    const frz = 0.5 + sz - mz;
    const vertX = Math.abs(sx) < 1e-9;
    const vertZ = Math.abs(sz) < 1e-9;
    const padX = Math.max(Math.abs(kx), Math.abs(mx)) + 2;
    const padZ = Math.max(Math.abs(kz), Math.abs(mz)) + 2;
    const NX = W + 2 * padX;
    const NZ = D + 2 * padZ;
    if (this.padG.length < NX * NZ) {
      this.padG = new A(NX * NZ);
      this.padL = new A(NX * NZ);
      this.padI = new A((NX + 1) * NZ);
    }
    if (this.R.length < W * NZ) {
      this.R = new A(W * NZ);
      this.S = new A(W * (NZ + 1));
    }
    const G = this.padG;
    const L = this.padL;
    const I = this.padI;
    const R = this.R;
    const S = this.S;
    const plane = W * D;
    let up = this.lineA;
    let next = this.lineB;
    up.fill(0);
    for (let row = top - 1; row >= 0; row--) {
      const base = row * plane;
      depth.set(up.subarray(0, plane), base);
      if (row === 0) break;
      // Padded copies of G (the line above) and ℓ (this row): z lines, each padded in x.
      for (let zz = 0; zz < NZ; zz++) {
        let z = zz - padZ;
        if (periodicZ) z = ((z % D) + D) % D;
        const d0 = zz * NX;
        if (z < 0 || z >= D) {
          G.fill(0, d0, d0 + NX);
          L.fill(0, d0, d0 + NX);
          continue;
        }
        SlabSweep.padLine(up, z * W, W, G, d0, padX, periodicX);
        SlabSweep.padLine(lad, base + z * W, W, L, d0, padX, periodicX);
      }
      // Per z line: prefix sums along x, then the x-mean R over [col + ½, col + ½ + sx].
      for (let zz = 0; zz < NZ; zz++) {
        const l0 = zz * NX;
        const i0 = zz * (NX + 1);
        let acc = 0;
        for (let j = 0; j < NX; j++) {
          I[i0 + j] = acc;
          acc += L[l0 + j];
        }
        I[i0 + NX] = acc;
        const r0 = zz * W;
        if (vertX) {
          for (let col = 0; col < W; col++) R[r0 + col] = L[l0 + col + padX];
        } else {
          for (let col = 0; col < W; col++) {
            const j = col + padX;
            const from = I[i0 + j] + 0.5 * L[l0 + j];
            const to = I[i0 + j + mx] + frx * L[l0 + j + mx];
            R[r0 + col] = (to - from) / sx;
          }
        }
      }
      // Prefix sums of R along z: the summed-area table of the row, with the x shift folded in.
      if (!vertZ) {
        S.fill(0, 0, W);
        for (let zz = 0; zz < NZ; zz++) {
          const s0 = zz * W;
          for (let col = 0; col < W; col++) S[s0 + W + col] = S[s0 + col] + R[s0 + col];
        }
      }
      for (let z = 0; z < D; z++) {
        const zj = z + padZ;
        const g0 = (zj + kz) * NX + padX + kx;
        const g1 = g0 + NX;
        const r = zj * W;
        const rm = (zj + mz) * W;
        const o = z * W;
        for (let col = 0; col < W; col++) {
          const g =
            (1 - fz) * (G[g0 + col] * (1 - fx) + G[g0 + col + 1] * fx) +
            fz * (G[g1 + col] * (1 - fx) + G[g1 + col + 1] * fx);
          let mean: number;
          if (vertZ) mean = R[r + col];
          else {
            const from = S[r + col] + 0.5 * R[r + col];
            const to = S[rm + col] + frz * R[rm + col];
            mean = (to - from) / sz;
          }
          next[o + col] = g + mean * perRow;
        }
      }
      const t = up;
      up = next;
      next = t;
    }
  }

  sample(x: number, y: number, z: number, out: Float64Array): void {
    const c = this.cell(x, y, z);
    if (c < 0) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 1;
      out[3] = 0;
      return;
    }
    out[0] = this.q[c];
    const len = Math.hypot(this.vx[c], this.vy[c], this.vz[c]);
    out[1] = this.vx[c] / len;
    out[2] = this.vy[c] / len;
    out[3] = this.vz[c] / len;
  }
}

export class SlabPyramid implements SlabLight {
  readonly W: number;
  readonly H: number;
  readonly D: number;
  readonly s: Arr;
  private readonly weights: Float64Array;
  private readonly a: number;
  private readonly C: number;
  private readonly cosHalfAngle: number;
  private readonly radius: number;
  private readonly periodicX: boolean;
  private readonly periodicZ: boolean;
  private top = 0;
  updates = 0;
  /** Cells visited by the V search in the last batch of samples. */
  searched = 0;

  constructor(
    W: number,
    H: number,
    D: number,
    c2: Params["c2"],
    periodicX: boolean,
    periodicZ: boolean,
    A: ArrCtor,
  ) {
    this.W = W;
    this.H = H;
    this.D = D;
    this.periodicX = periodicX;
    this.periodicZ = periodicZ;
    this.s = new A(W * H * D);
    const qMax = Math.max(0, Math.floor(c2.qMax));
    this.weights = new Float64Array(qMax + 1);
    for (let q = 0; q <= qMax; q++) this.weights[q] = c2.a * c2.b ** -q;
    this.a = c2.a;
    this.C = c2.C;
    this.cosHalfAngle = Math.cos(c2.perceptionAngle * DEG);
    this.radius = Math.max(1, Math.floor(c2.perceptionDistance));
  }

  clear(): void {
    this.s.fill(0, 0, this.top * this.W * this.D);
    this.top = 0;
    this.updates = 0;
    this.searched = 0;
  }

  deposit(x: number, y: number, z: number, area: number): void {
    const { W, H, D, s, weights, periodicX, periodicZ } = this;
    const I = Math.floor(x);
    const J = Math.floor(y);
    const Z = Math.floor(z);
    if (J >= H || J < 0) return;
    if (J >= this.top) this.top = J + 1;
    for (let q = 0; q < weights.length; q++) {
      const row = J - q;
      if (row < 0) break;
      const w = weights[q] * area;
      for (let dz = -q; dz <= q; dz++) {
        let zz = Z + dz;
        if (periodicZ) {
          if (zz < 0) zz += D;
          else if (zz >= D) zz -= D;
          if (zz < 0 || zz >= D) zz = ((zz % D) + D) % D;
        } else if (zz < 0 || zz >= D) continue;
        const base = (row * D + zz) * W;
        if (periodicX) {
          for (let dx = -q; dx <= q; dx++) {
            let col = I + dx;
            if (col < 0) col += W;
            else if (col >= W) col -= W;
            s[base + col] += w;
          }
          this.updates += 2 * q + 1;
        } else {
          const lo = Math.max(0, I - q);
          const hi = Math.min(W - 1, I + q);
          for (let col = lo; col <= hi; col++) s[base + col] += w;
          this.updates += hi - lo + 1;
        }
      }
    }
  }

  compute(): void {}

  sample(x: number, y: number, z: number, out: Float64Array): void {
    const { W, H, D, s, periodicX, periodicZ } = this;
    let I = Math.floor(x);
    let Z = Math.floor(z);
    const J = Math.floor(y);
    if (periodicX) I = ((I % W) + W) % W;
    if (periodicZ) Z = ((Z % D) + D) % D;
    if (I < 0 || I >= W || J < 0 || J >= H || Z < 0 || Z >= D) {
      out[0] = 0;
      return;
    }
    out[0] = Math.max(this.C - s[(J * D + Z) * W + I] + this.a, 0);
    // V: the least-shaded cell in the cone around straight up (the bud direction is not
    // carried here; any fixed axis costs the same).
    const r = this.radius;
    let best = Number.POSITIVE_INFINITY;
    let vx = 0;
    let vy = 1;
    let vz = 0;
    for (let row = Math.max(0, J - r); row <= Math.min(H - 1, J + r); row++) {
      for (let dzc = -r; dzc <= r; dzc++) {
        let zz = Z + dzc;
        if (periodicZ) zz = ((zz % D) + D) % D;
        else if (zz < 0 || zz >= D) continue;
        for (let dxc = -r; dxc <= r; dxc++) {
          let col = I + dxc;
          if (periodicX) {
            if (col < 0) col += W;
            else if (col >= W) col -= W;
          } else if (col < 0 || col >= W) continue;
          this.searched++;
          const ex = dxc + 0.5 - (x - Math.floor(x));
          const ey = row + 0.5 - y;
          const ez = dzc + 0.5 - (z - Math.floor(z));
          const d = Math.hypot(ex, ey, ez);
          if (d > r || d === 0) continue;
          if (ey / d < this.cosHalfAngle) continue;
          const sh = s[(row * D + zz) * W + col];
          if (sh < best) {
            best = sh;
            vx = ex / d;
            vy = ey / d;
            vz = ez / d;
          }
        }
      }
    }
    out[1] = vx;
    out[2] = vy;
    out[3] = vz;
  }
}

/** Per-season timings of the slab model, for the seasons it was run on. */
export interface SlabTiming {
  seasons: number[];
  depositMs: number[];
  computeMs: number[];
  sampleMs: number[];
  updates: number[];
  deposits: number[];
  samples: number[];
  searched: number[];
}

/**
 * The real 2D light model drives the run; on the chosen seasons the same deposits and samples are
 * replayed into the slab model and timed. Each 2D deposit is placed at a depth z from a golden-ratio
 * sequence, so the foliage fills the slab's depth as a crown as deep as it is wide would.
 */
export class Shadowed implements LightModel {
  readonly width: number;
  readonly height: number;
  readonly timing: SlabTiming = {
    seasons: [],
    depositMs: [],
    computeMs: [],
    sampleMs: [],
    updates: [],
    deposits: [],
    samples: [],
    searched: [],
  };
  private dep = new Float64Array(3 * 1024);
  private nDep = 0;
  private smp = new Float64Array(2 * 1024);
  private nSmp = 0;
  private recording = false;
  private readonly out = new Float64Array(4);
  /** The deposits (x, y, z, area) of the last timed season, for the kernel port. */
  lastDeposits = new Float64Array(0);

  readonly inner: LightModel;
  readonly slab: SlabLight;
  private readonly timed: (season: number) => boolean;

  constructor(inner: LightModel, slab: SlabLight, timed: (season: number) => boolean) {
    this.inner = inner;
    this.slab = slab;
    this.timed = timed;
    this.width = inner.width;
    this.height = inner.height;
  }

  private z(i: number): number {
    return this.slab.D * ((0.5 + i * GOLDEN) % 1);
  }

  /** Replays last season's samples (the slab still holds that season's field). */
  flush(): void {
    if (!this.recording) return;
    this.recording = false;
    const { slab, out, smp } = this;
    const t0 = performance.now();
    for (let i = 0; i < this.nSmp; i++) slab.sample(smp[2 * i], smp[2 * i + 1], this.z(i), out);
    this.timing.sampleMs.push(performance.now() - t0);
    this.timing.samples.push(this.nSmp);
    this.timing.searched.push(slab instanceof SlabPyramid ? slab.searched : 0);
  }

  clear(): void {
    this.flush();
    this.inner.clear();
    this.nDep = 0;
    this.nSmp = 0;
  }

  deposit(x: number, y: number, area = 1): void {
    this.inner.deposit(x, y, area);
    if (3 * this.nDep + 3 > this.dep.length) {
      const d = new Float64Array(2 * this.dep.length);
      d.set(this.dep);
      this.dep = d;
    }
    this.dep[3 * this.nDep] = x;
    this.dep[3 * this.nDep + 1] = y;
    this.dep[3 * this.nDep + 2] = area;
    this.nDep++;
  }

  addWall(wall: Wall): void {
    this.inner.addWall(wall);
  }

  compute(season: number): void {
    this.inner.compute(season);
    if (!this.timed(season)) return;
    const { slab, dep } = this;
    const t0 = performance.now();
    slab.clear();
    for (let i = 0; i < this.nDep; i++)
      slab.deposit(dep[3 * i], dep[3 * i + 1], this.z(i), dep[3 * i + 2]);
    const t1 = performance.now();
    slab.compute();
    const t2 = performance.now();
    const T = this.timing;
    T.seasons.push(season);
    T.depositMs.push(t1 - t0);
    T.computeMs.push(t2 - t1);
    T.updates.push(slab.updates);
    T.deposits.push(this.nDep);
    this.recording = true;
    this.lastDeposits = new Float64Array(4 * this.nDep);
    for (let i = 0; i < this.nDep; i++) {
      this.lastDeposits[4 * i] = dep[3 * i];
      this.lastDeposits[4 * i + 1] = dep[3 * i + 1];
      this.lastDeposits[4 * i + 2] = this.z(i);
      this.lastDeposits[4 * i + 3] = dep[3 * i + 2];
    }
  }

  sample(x: number, y: number, dir: number, out: LightSample): void {
    this.inner.sample(x, y, dir, out);
    if (!this.recording) return;
    if (2 * this.nSmp + 2 > this.smp.length) {
      const d = new Float64Array(2 * this.smp.length);
      d.set(this.smp);
      this.smp = d;
    }
    this.smp[2 * this.nSmp] = x;
    this.smp[2 * this.nSmp + 1] = y;
    this.nSmp++;
  }

  field(): Float64Array<ArrayBuffer> | null {
    return this.inner.field();
  }
}
