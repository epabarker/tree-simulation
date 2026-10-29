/**
 * The prototype preview's slab drawing (code/2026-10-29-g05-preview/slab-view.ts), copied for I2 with
 * the imports of today's src: the garden's own WebGL2 renderer, with only the draw call replaced,
 * drawing a stand grown in the slab orthographically, (x, y) in z order, far to near one depth slice
 * at a time (`SlabOptions.z`: each metamer's own z). There is no perspective, darkening or rank
 * behind (the review's decided view). I3 replaces this with the 3D renderer.
 */

import type { Snapshot } from "../../../../../src/core/types.ts";
import { BudState } from "../../../../../src/core/types.ts";
import { parseColor } from "../../../../../src/web/render/colors.ts";
import {
  isLeafStyleName,
  LEAF_PALETTES,
  LEAF_SHAPES,
  LEAF_STYLES,
  type LeafStyle,
} from "../../../../../src/web/render/leaf-styles.ts";
import type { Renderer } from "../../../../../src/web/render/renderer.ts";
import { RAMP_STEPS } from "../../../../../src/web/render/theme.ts";

export type ZModel = "open" | "periodic";

export interface SlabOptions {
  model: ZModel;
  /** Slab depth in cells (the review's D = 32). */
  D: number;
  /** Horizontal field of view of the frontal camera, degrees; sets its distance F from the slab. */
  fovDeg: number;
  /** Eye height in cells. */
  eyeY: number;
  /** Darkening at the back of the slab (0 none, 1 black). */
  darken: number;
  /** Fade of the second rank toward the sky (periodic only). */
  dim: number;
  /**
   * The 3D prototype (code/2026-10-29-proto3d): each metamer's own z (snapshot rows), drawn
   * orthographically, (x, y) in z order, with no perspective, darkening or rank behind.
   */
  z?: Float32Array;
}

export const DEFAULTS: Omit<SlabOptions, "model"> = {
  D: 32,
  fovDeg: 40,
  eyeY: 8,
  darken: 0.4,
  dim: 0.55,
};

const PHI = (Math.sqrt(5) - 1) / 2;
/** Share of the remaining way to its target depth an axis covers per metamer. */
const KAPPA = 0.22;
const ROSETTE_SIZE = 0.8;

/** Depth of every metamer (parents before children). */
export function assignDepth(s: Snapshot, model: ZModel, D: number): Float32Array {
  const n = s.metamerCount;
  const z = new Float32Array(n);
  const target = new Float32Array(n);
  const axes = new Map<number, number>();
  for (let j = 0; j < n; j++) {
    const p = s.parent[j] as number;
    if (p < 0) {
      z[j] = target[j] = D / 2;
      continue;
    }
    if ((s.order[j] as number) > (s.order[p] as number)) {
      const tree = s.tree[j] as number;
      const i = axes.get(tree) ?? 0;
      axes.set(tree, i + 1);
      let f = (0.5 + i * PHI) % 1;
      // A hedgerow's crowns reach for the open faces: push the targets toward 0 and 1.
      if (model === "open") f = 0.5 + 0.5 * Math.sign(f - 0.5) * Math.abs(2 * f - 1) ** 0.6;
      target[j] = s.order[j] === 1 ? D * f : (z[p] as number) + 0.5 * D * (f - 0.5);
    } else {
      target[j] = target[p] as number;
    }
    z[j] = (z[p] as number) + KAPPA * ((target[j] as number) - (z[p] as number));
  }
  for (let j = 0; j < n; j++) z[j] = Math.min(D - 0.5, Math.max(0.5, z[j] as number));
  return z;
}

interface LeafList {
  count: number;
  metamer: Int32Array;
  dz: Float32Array;
  a: Float32Array;
  b: Float32Array;
  scale: Float32Array;
  ramp: Uint8Array;
  palette: Uint8Array;
  shape: Uint8Array;
  aspect: Float32Array;
}

/** The pseudo-depth view's leaf clusters, laid out once per snapshot, each leaf with its own z. */
function layoutLeaves(s: Snapshot, leafAge: number): LeafList {
  const base = LEAF_STYLES.broadleaf as LeafStyle;
  const styleOf = new Map<number, LeafStyle>();
  for (const m of s.metrics) {
    const name = m.species ? s.species[m.species]?.leaf : undefined;
    styleOf.set(m.tree, name && isLeafStyleName(name) ? LEAF_STYLES[name] : base);
  }
  const n = s.metamerCount;
  const cap = (n + s.budCount) * 8;
  const L: LeafList = {
    count: 0,
    metamer: new Int32Array(cap),
    dz: new Float32Array(cap),
    a: new Float32Array(cap),
    b: new Float32Array(cap),
    scale: new Float32Array(cap),
    ramp: new Uint8Array(cap),
    palette: new Uint8Array(cap),
    shape: new Uint8Array(cap),
    aspect: new Float32Array(cap),
  };
  let maxLight = 0;
  for (let j = 0; j < n; j++) {
    if ((s.age[j] as number) <= leafAge + 1 && (s.light[j] as number) > maxLight)
      maxLight = s.light[j] as number;
  }
  const push = (j: number, id: number, light: number, size: number) => {
    const st = styleOf.get(s.tree[j] as number) ?? base;
    const along = Math.cos(st.spread);
    const across = Math.sin(st.spread);
    const turn = hash01(s.tree[j] as number, id);
    const c = Math.floor((maxLight > 0 ? Math.sqrt(Math.min(1, light / maxLight)) : 0) * (RAMP_STEPS - 1));
    for (let i = 0; i < st.cluster; i++) {
      const psi = 2 * Math.PI * (turn + i / st.cluster);
      const w = across * Math.cos(psi);
      const len = Math.hypot(along, w);
      const k = L.count++;
      L.metamer[k] = j;
      L.dz[k] = 0.6 * Math.sin(psi);
      L.a[k] = along / len;
      L.b[k] = w / len;
      L.scale[k] = size * len * (st.length / base.length);
      L.ramp[k] = c;
      L.palette[k] = LEAF_PALETTES.indexOf(st.palette);
      L.shape[k] = LEAF_SHAPES.indexOf(st.shape);
      L.aspect[k] = st.aspect;
    }
  };
  for (let j = 0; j < n; j++) {
    if ((s.age[j] as number) <= leafAge) push(j, s.birthId[j] as number, s.light[j] as number, 1);
  }
  for (let i = 0; i < s.budCount; i++) {
    if (s.budState[i] !== BudState.shortShoot) continue;
    const j = s.budMetamer[i] as number;
    if ((s.age[j] as number) <= leafAge + 1) continue;
    push(j, (s.birthId[j] as number) ^ 0x5bd1, s.budQ[i] as number, ROSETTE_SIZE);
  }
  return L;
}

function hash01(tree: number, id: number): number {
  let h = Math.imul(id ^ (tree << 20) ^ (2 << 27), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/**
 * Draws `s` as a slab seen from the front with `renderer` (a WebGL2Renderer whose scene already
 * holds `s` and a fitted camera). Static: one frame at the end of the season.
 */
export function drawSlab(renderer: Renderer, s: Snapshot, o: SlabOptions): void {
  // biome-ignore lint: the renderer's private parts, used as they are
  const R = renderer as any;
  const gl: WebGL2RenderingContext = R.gl;
  const scene = renderer.scene;
  const theme = R.theme;
  const { width: w, height: h, dpr } = scene;
  const { cx, scale } = scene.camera;

  // Geometry without the pseudo-depth squeeze: the 2D tree as grown.
  scene.depth = false;
  scene.computeGeometry(1);
  const g = scene.geom;
  const n = s.metamerCount;
  const ortho = o.z !== undefined;
  const z = o.z ?? assignDepth(s, o.model, o.D);
  const leafAge = LEAF_STYLES.broadleaf.leafAge;
  const L = layoutLeaves(s, leafAge);

  const F = (0.5 * (w / scale)) / Math.tan((0.5 * o.fovDeg * Math.PI) / 180);
  const ranks = o.model === "periodic" && !ortho ? 2 : 1;
  const zMax = o.D * ranks;
  // The picture plane is the trunks' line (z = D/2), so trunks draw at the garden's own scale.
  const k = ortho ? (_: number) => 1 : (zz: number) => F / (F + zz - o.D / 2);

  // Wood colours: the natural bark ramp, as the garden draws it.
  const bark: Uint8Array = R.paletteBytes(scene.palette("natural", theme));
  const barkIndex = scene.colorIndices("natural", bark.length / 4);
  const leafRamps: Uint8Array[] = LEAF_PALETTES.map((p) => R.paletteBytes(theme.leaf[p], 0.92));
  const sky = parseColor(theme.skyBottom);

  // Far to near: every metamer and leaf of every rank, sorted by depth into one-cell slices.
  const slices = Math.ceil(zMax);
  const wood: number[][] = Array.from({ length: slices }, () => []);
  const leaves: number[][] = Array.from({ length: slices }, () => []);
  for (let r = 0; r < ranks; r++) {
    for (let j = 0; j < n; j++) {
      const zz = (z[j] as number) + r * o.D;
      wood[Math.min(slices - 1, Math.max(0, Math.floor(zz)))]?.push(r * n + j);
    }
    for (let i = 0; i < L.count; i++) {
      const zz = (z[L.metamer[i] as number] as number) + (L.dz[i] as number) + r * o.D;
      leaves[Math.min(slices - 1, Math.max(0, Math.floor(zz)))]?.push(r * L.count + i);
    }
  }

  gl.viewport(0, 0, renderer.canvas.width, renderer.canvas.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const groundPx = (yWorld: number) => (h - scene.worldToScreen(0, yWorld)[1]) * dpr;
  R.drawBackdrop(0, theme.skyTop, theme.skyBottom, groundPx(0));
  // The ground recedes to the far line of the last rank, so far trees stand on it, not on sky.
  R.drawBackdrop(1, theme.ground, theme.groundDeep, groundPx(o.eyeY * (1 - k(zMax))));

  const uniforms = {
    u_view: [cx, (2 * scale) / w, 1 - (2 * scene.groundY()) / h, (2 * scale) / h],
    u_px: 1 / scale,
    u_leaf: [LEAF_STYLES.broadleaf.length, LEAF_STYLES.broadleaf.aspect, 3.5],
  };
  const offsets = s.periodic ? [-s.width, 0, s.width] : [0];
  const tint = (out: Uint8Array, at: number, rgba: ArrayLike<number>, zz: number, r: number) => {
    const dark = ortho ? 1 : 1 - o.darken * Math.min(1, zz / o.D);
    const fade = r > 0 ? o.dim : 0;
    for (let c = 0; c < 3; c++) {
      // The rank behind fades toward the sky, as distance does.
      const v = (rgba[c] as number) * dark;
      out[at + c] = Math.round(v * (1 - fade) + (sky[c] as number) * fade);
    }
    out[at + 3] = rgba[3] as number;
  };

  const segs = R.segments;
  const leafBatch = R.leafBatch;
  for (let sl = slices - 1; sl >= 0; sl--) {
    const ws = wood[sl] as number[];
    const ls = leaves[sl] as number[];
    for (const off of offsets) {
      if (ws.length) {
        const a = R.stream(segs, "a_a", ws.length);
        const b = R.stream(segs, "a_b", ws.length);
        const rr = R.stream(segs, "a_r", ws.length);
        const col = R.stream(segs, "a_color", ws.length);
        ws.forEach((id, q) => {
          const r = Math.floor(id / n);
          const j = id - r * n;
          const zz = (z[j] as number) + r * o.D;
          const f = k(zz);
          a[2 * q] = cx + ((g.baseX[j] as number) + off - cx) * f;
          a[2 * q + 1] = o.eyeY + ((g.baseY[j] as number) - o.eyeY) * f;
          b[2 * q] = cx + ((g.tipX[j] as number) + off - cx) * f;
          b[2 * q + 1] = o.eyeY + ((g.tipY[j] as number) - o.eyeY) * f;
          rr[2 * q] = (g.radius[j] as number) * f;
          rr[2 * q + 1] = (g.tipRadius[j] as number) * f;
          const c = (barkIndex[j] as number) * 4;
          tint(col, 4 * q, bark.subarray(c, c + 4), zz, r);
        });
        R.upload(segs, ws.length);
        R.drawBatch(segs, ws.length, uniforms);
      }
      if (ls.length) {
        const pos = R.stream(leafBatch, "a_pos", ls.length);
        const dir = R.stream(leafBatch, "a_dir", ls.length);
        const grow = R.stream(leafBatch, "a_grow", ls.length);
        const shape = R.stream(leafBatch, "a_shape", ls.length);
        const col = R.stream(leafBatch, "a_color", ls.length);
        ls.forEach((id, q) => {
          const r = Math.floor(id / L.count);
          const i = id - r * L.count;
          const j = L.metamer[i] as number;
          const zz = (z[j] as number) + (L.dz[i] as number) + r * o.D;
          const f = k(zz);
          let dx = (g.tipX[j] as number) - (g.baseX[j] as number);
          let dy = (g.tipY[j] as number) - (g.baseY[j] as number);
          const len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;
          const la = L.a[i] as number;
          const lb = L.b[i] as number;
          pos[2 * q] = cx + ((g.tipX[j] as number) + off - cx) * f;
          pos[2 * q + 1] = o.eyeY + ((g.tipY[j] as number) - o.eyeY) * f;
          dir[2 * q] = la * dx - lb * dy;
          dir[2 * q + 1] = la * dy + lb * dx;
          grow[q] = (L.scale[i] as number) * f;
          shape[2 * q] = L.shape[i] as number;
          shape[2 * q + 1] = L.aspect[i] as number;
          const ramp = leafRamps[L.palette[i] as number] as Uint8Array;
          const c = (L.ramp[i] as number) * 4;
          tint(col, 4 * q, ramp.subarray(c, c + 4), zz, r);
        });
        R.upload(leafBatch, ls.length);
        R.drawBatch(leafBatch, ls.length, uniforms);
      }
    }
  }
  // The nearest ground line last, so stubs that grew below the ground stay under it.
  R.drawBackdrop(1, theme.ground, theme.groundDeep, groundPx(o.eyeY * (1 - k(0))));
  // The renderer's own draw() must rebuild everything next time.
  R.uploaded = { next: null, prev: null, key: "" };
}
