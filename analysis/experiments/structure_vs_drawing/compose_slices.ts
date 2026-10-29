/**
 * Stacked slices (prototype B): N planar oaks, grown independently (seeds s₀ … s₀+N−1), composed
 * around one trunk and written for the page's own renderer (a.html) and the structure measures.
 *
 * - Slice 0's trunk (its order-0 chain) is the shared trunk. Every other slice's trunk is dropped
 *   and each subtree that leaves it is grafted onto the shared trunk metamer whose tip is nearest
 *   its own attach height (the top, if above), its base moved onto that tip.
 * - Each slice is a vertical plane through the trunk at azimuth θ_k = kπ/N (a planar tree spans
 *   both sides, so N half-turns cover the circle), each limb jittered by up to ±π/(2N) (keyed hash),
 *   so the planes do not read as sheets from above.
 * - Girth by the pipe model: each slice's wood is scaled by 1/√N (one slice's trunk is already
 *   fitted to a whole tree's H/D), and the shared trunk carries √(own² + Σ grafted r²), never
 *   thinner than its fitted radius (which includes stress wood and scars, not only pipes).
 * - N = 1 is today's page: the slice's own snapshot, which the renderer turns by ADR 0008.
 *
 * Writes, per composite, <name>.snap.json (side view from the south, cells; every row order 0 so
 * the renderer adds no turn of its own; each slice's light, age and buds kept) and <name>.skel.json
 * (3D metres, leaf sites as export_ours.ts). Checks its own output and throws on a fault.
 *
 *   node analysis/experiments/structure_vs_drawing/compose_slices.ts runs/structure-vs-drawing/data
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { mergeParams, type Params } from "../../../src/core/params.ts";
import { presetParams } from "../../../src/core/presets.ts";
import { type Snapshot, SnapshotBuilder } from "../../../src/core/snapshot.ts";
import { BudState } from "../../../src/core/tree.ts";
import { World } from "../../../src/core/world.ts";

const CELL_M = 0.25;
const OAK_LEAF_AGE = 5; // LEAF_STYLES.oak.leafAge
const NS = [1, 4, 8, 16, 32];
const out = process.argv[2] ?? ".";

function hash01(a: number, b: number, salt: number): number {
  let h = Math.imul(b ^ (a << 20) ^ (salt << 27), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** One grown oak: its snapshot rows, planar geometry (cells, root at x = 0) and leaf sites. */
interface Slice {
  snap: Record<string, unknown>;
  n: number;
  parent: number[];
  order: number[];
  radius: number[];
  light: number[];
  age: number[];
  bx: number[];
  by: number[];
  tx: number[];
  ty: number[];
  rosette: boolean[];
  growMs: number;
}

function sliceOf(s: Snapshot, id: number, growMs: number): Slice {
  const rows: number[] = [];
  const map = new Int32Array(s.metamerCount).fill(-1);
  for (let j = 0; j < s.metamerCount; j++) {
    if (s.tree[j] === id) {
      map[j] = rows.length;
      rows.push(j);
    }
  }
  const pick = <T extends ArrayLike<number>>(a: T) => rows.map((j) => a[j] as number);
  const buds: number[] = [];
  for (let i = 0; i < s.budCount; i++) if (s.tree[s.budMetamer[i] as number] === id) buds.push(i);
  const parent = rows.map((j) => ((s.parent[j] as number) >= 0 ? map[s.parent[j] as number] : -1));
  const snap = {
    season: s.season,
    width: s.width,
    height: s.height,
    metamerCount: rows.length,
    parent,
    x0: pick(s.x0),
    y0: pick(s.y0),
    angle: pick(s.angle),
    length: pick(s.length),
    radius: pick(s.radius),
    tree: pick(s.tree),
    birthId: pick(s.birthId),
    order: pick(s.order),
    light: pick(s.light),
    resource: pick(s.resource),
    age: pick(s.age),
    stress: pick(s.stress),
    budMetamer: buds.map((i) => map[s.budMetamer[i] as number]),
    budState: buds.map((i) => s.budState[i] as number),
    budQ: buds.map((i) => s.budQ[i] as number),
    species: s.species,
    metrics: s.metrics.filter((m) => m.tree === id),
  };
  const n = rows.length;
  const bx: number[] = [];
  const by: number[] = [];
  const tx: number[] = [];
  const ty: number[] = [];
  const x0 = snap.x0[0] as number;
  for (let i = 0; i < n; i++) {
    const p = parent[i] as number;
    bx.push(p >= 0 ? (tx[p] as number) : (snap.x0[i] as number) - x0);
    by.push(p >= 0 ? (ty[p] as number) : (snap.y0[i] as number));
    tx.push((bx[i] as number) + (snap.length[i] as number) * Math.cos(snap.angle[i] as number));
    ty.push((by[i] as number) + (snap.length[i] as number) * Math.sin(snap.angle[i] as number));
  }
  const rosette = new Array<boolean>(n).fill(false);
  snap.budState.forEach((st, k) => {
    if (st === BudState.shortShoot) rosette[snap.budMetamer[k] as number] = true;
  });
  return {
    snap,
    n,
    parent: parent as number[],
    order: snap.order,
    radius: snap.radius,
    light: snap.light,
    age: snap.age,
    bx,
    by,
    tx,
    ty,
    rosette,
    growMs,
  };
}

function tallest(s: Snapshot, interior: (tree: number) => boolean): number {
  const oaks = s.metrics.filter((m) => m.alive && m.species === "oak" && interior(m.tree));
  oaks.sort((a, b) => b.height - a.height);
  const best = oaks[0];
  if (!best) throw new Error("no live oak");
  return best.tree;
}

/**
 * The wood at Wytham's spacing: five oaks 48 cells (12 m) apart on a 240-cell ring, so crowns of
 * about the scanned dominants' width (≈ 16 m) can close, against oakWood's 21 cells (5 m).
 */
function wood12(seed: number): Params {
  return mergeParams(presetParams("oakWood", seed), {
    world: { width: 240, height: 130, walls: [], sides: "periodic" },
    trees: [24, 72, 120, 168, 216].map((x) => ({ x, species: "oak" })),
  });
}

function grow(variant: "oakOpen" | "oakWood" | "wood12", seed: number, seasons: number): Slice {
  const t0 = performance.now();
  const world = new World(variant === "wood12" ? wood12(seed) : presetParams(variant, seed));
  world.run(seasons);
  const s = new SnapshotBuilder().build(world, 0, { junctions: false, field: false });
  const id =
    variant === "oakOpen" ? 0 : tallest(s, variant === "wood12" ? (t) => t < 5 : (t) => t >= 2 && t <= 7);
  return sliceOf(s, id, performance.now() - t0);
}

/** The first season the open oak (seed) is at least `metres` tall. */
function seasonAtHeight(seed: number, metres: number): number {
  const world = new World(presetParams("oakOpen", seed));
  for (let season = 1; season <= 300; season++) {
    world.step();
    const t = world.trees[0];
    if (!t) break;
    let h = 0;
    for (let i = 0; i < t.m.length; i++) h = Math.max(h, t.tipY(i));
    if (h * CELL_M >= metres) return season;
  }
  throw new Error(`the open oak never reaches ${metres} m`);
}

/**
 * Composes the first `count` slices. Level 1 grafts each other slice's limbs (order-1 subtrees)
 * onto the shared trunk; level 2 keeps slice 0's limbs, turned out of the plane by the page's own
 * rule (ADR 0008), and grafts each other slice's branches (order-2 subtrees) onto the slice-0 limb
 * nearest them in the plane, fanned around it. Every graft turns about the vertical through its
 * attach point, so gravity's shape (sag, upturned tips) stays vertical.
 */
function compose(slices: Slice[], count: number, name: string, level: 1 | 2) {
  const scale = 1 / Math.sqrt(count);
  const s0 = slices[0] as Slice;
  // Rows of the composite: 3D base and tip (cells), radius, light, age, leafy, parent.
  const ax: number[] = [];
  const ay: number[] = [];
  const az: number[] = [];
  const bx: number[] = [];
  const by: number[] = [];
  const bz: number[] = [];
  const rad: number[] = [];
  const light: number[] = [];
  const age: number[] = [];
  const parent: number[] = [];
  const rosette: boolean[] = [];
  const graftedRoot: number[] = []; // composite rows grafted onto slice 0, with their host row
  const graftedOn: number[] = [];
  const trunk: number[] = []; // composite rows of the shared trunk, in chain order
  const trunkSrc: number[] = []; // and their rows in slice 0
  // Level 2 hosts: slice 0's order-1 rows, their planar tips and their limb's azimuth.
  const hosts: { row: number; x: number; y: number; theta: number }[] = [];
  const push = (sl: Slice, i: number, a: number[], b: number[], p: number) => {
    ax.push(a[0] as number);
    ay.push(a[1] as number);
    az.push(a[2] as number);
    bx.push(b[0] as number);
    by.push(b[1] as number);
    bz.push(b[2] as number);
    rad.push((sl.radius[i] as number) * scale);
    light.push(sl.light[i] as number);
    age.push(sl.age[i] as number);
    rosette.push(sl.rosette[i] as boolean);
    parent.push(p);
    return ax.length - 1;
  };
  for (let k = 0; k < count; k++) {
    const sl = slices[k] as Slice;
    const row = new Int32Array(sl.n).fill(-1);
    // Per row: the pivot it turns about (its graft's base in this slice), the composite row it
    // hangs on and its azimuth; inherited down each graft.
    const pivot = new Int32Array(sl.n).fill(-1);
    const host = new Int32Array(sl.n).fill(-1);
    const theta = new Float64Array(sl.n);
    const dropBelow = k === 0 ? 1 : level; // orders dropped from this slice (its trunk; at level 2 its limbs)
    for (let i = 0; i < sl.n; i++) {
      const p = sl.parent[i] as number;
      const o = sl.order[i] as number;
      if (k === 0 && o === 0) {
        row[i] = push(sl, i, [sl.bx[i], sl.by[i], 0] as number[], [sl.tx[i], sl.ty[i], 0] as number[], p >= 0 ? (row[p] as number) : -1);
        trunk.push(row[i] as number);
        trunkSrc.push(i);
        continue;
      }
      if (o < dropBelow) continue;
      if (p >= 0 && (sl.order[p] as number) === (k === 0 ? 0 : level - 1)) {
        // A graft root (for slice 0, one of its own limbs on the trunk).
        pivot[i] = i;
        if (k === 0) {
          host[i] = row[p] as number;
          if (level === 1 || count === 1) theta[i] = (hash01(k, i, 7) - 0.5) * (Math.PI / count);
          else {
            // The page's turn for this limb (scene.ts, ADR 0008): spread 0.55 + 0.45·|sin φ|.
            const phi = 2 * Math.PI * hash01(sl.snap.tree[i] as number, sl.snap.birthId[i] as number, 1);
            theta[i] = Math.sign(Math.cos(phi)) * Math.acos(0.55 + 0.45 * Math.abs(Math.sin(phi)));
          }
        } else if (level === 1) {
          const h = sl.by[i] as number;
          let best = trunk[0] as number;
          for (const t of trunk) if (Math.abs((by[t] as number) - h) < Math.abs((by[best] as number) - h)) best = t;
          host[i] = best;
          theta[i] = (k * Math.PI) / count + (hash01(k, i, 7) - 0.5) * (Math.PI / count);
        } else {
          let best = hosts[0];
          if (!best) throw new Error(`${name}: slice 0 has no limbs to graft onto`);
          let d = Number.POSITIVE_INFINITY;
          for (const h of hosts) {
            const e = Math.hypot(h.x - (sl.bx[i] as number), h.y - (sl.by[i] as number));
            if (e < d) {
              d = e;
              best = h;
            }
          }
          host[i] = best.row;
          // Fanned around the host limb's own plane: ±0.4π across the slices, jittered.
          const psi = (k / count - 0.5) * 0.8 * Math.PI + (hash01(k, i, 7) - 0.5) * ((0.8 * Math.PI) / count);
          theta[i] = best.theta + psi;
        }
      } else {
        pivot[i] = pivot[p] as number;
        host[i] = host[p] as number;
        theta[i] = theta[p] as number;
      }
      const v = pivot[i] as number;
      const t = host[i] as number;
      const c = Math.cos(theta[i] as number);
      const sn = Math.sin(theta[i] as number);
      const place = (x: number, y: number) => {
        const dx = x - (sl.bx[v] as number);
        const dy = y - (sl.by[v] as number);
        return [(bx[t] as number) + dx * c, (by[t] as number) + dy, (bz[t] as number) + dx * sn];
      };
      const a = place(sl.bx[i] as number, sl.by[i] as number);
      const b = place(sl.tx[i] as number, sl.ty[i] as number);
      const pr = pivot[i] === i ? t : (row[p] as number);
      row[i] = push(sl, i, a, b, pr);
      if (k === 0 && o === 1 && level === 2) {
        hosts.push({ row: row[i] as number, x: sl.tx[i] as number, y: sl.ty[i] as number, theta: theta[i] as number });
      }
      // Slice 0's own wood is already in its pipes; only other slices' grafts add.
      if (pivot[i] === i && k > 0) {
        graftedRoot.push(row[i] as number);
        graftedOn.push(t);
      }
    }
  }
  // Girth by the pipe model: slice 0's wood carries every graft above it; the trunk is never
  // thinner than its fitted radius (stress wood and scars are not pipes).
  const n0 = graftedRoot.length > 0 ? (graftedRoot[0] as number) : ax.length; // slice 0's rows come first
  const extra = new Float64Array(ax.length);
  const isGraft = new Uint8Array(ax.length);
  for (const g of graftedRoot) isGraft[g] = 1;
  for (let i = ax.length - 1; i >= 0; i--) {
    const p = parent[i] as number;
    if (p < 0) continue;
    if (isGraft[i]) extra[p] += (rad[i] as number) ** 2;
    else if (i < n0) extra[p] += extra[i] as number;
  }
  let pipeRatio = 1;
  for (let i = 0; i < n0; i++) rad[i] = Math.sqrt((rad[i] as number) ** 2 + (extra[i] as number));
  trunk.forEach((t, j) => {
    const fitted = s0.radius[trunkSrc[j] as number] as number;
    if (j === 0) pipeRatio = (rad[t] as number) / fitted;
    rad[t] = Math.max(rad[t] as number, fitted);
  });

  // Checks.
  const n = ax.length;
  for (let i = 0; i < n; i++) {
    const p = parent[i] as number;
    if (p >= i) throw new Error(`${name}: parent ${p} not before ${i}`);
    if (p >= 0) {
      const gap = Math.hypot((ax[i] as number) - (bx[p] as number), (ay[i] as number) - (by[p] as number), (az[i] as number) - (bz[p] as number));
      if (gap > 1e-6) throw new Error(`${name}: row ${i} starts ${gap} cells off its parent's tip`);
    }
  }
  const ownKids = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const p = parent[i] as number;
    if (p >= 0 && !isGraft[i]) ownKids[p]++;
  }
  // True when slice-0 row t had no children of its own (a tip before grafting).
  const wasTip = (t: number) => t < n0 && ownKids[t] === 0;
  const kids = new Int32Array(n);
  for (let i = 0; i < n; i++) if ((parent[i] as number) >= 0) kids[parent[i] as number]++;
  let tips = 0;
  for (let i = 0; i < n; i++) if (kids[i] === 0) tips++;
  let expected = 0;
  for (let k = 0; k < count; k++) {
    const sl = slices[k] as Slice;
    const sk = new Int32Array(sl.n);
    for (let i = 0; i < sl.n; i++) if ((sl.parent[i] as number) >= 0) sk[sl.parent[i] as number]++;
    for (let i = 0; i < sl.n; i++) if (sk[i] === 0 && (k === 0 || (sl.order[i] as number) >= level)) expected++;
  }
  // A graft onto a slice-0 tip makes that tip a fork.
  for (const t of new Set(graftedOn)) if (wasTip(t)) expected--;
  if (tips !== expected) throw new Error(`${name}: ${tips} tips, expected ${expected}`);

  // Side view from the south (x right, y up), cells; the snapshot the page's renderer reads.
  const xs = ax.map((x) => x + 200);
  const snap = {
    season: s0.snap.season,
    width: 400,
    height: 200,
    metamerCount: n,
    parent,
    x0: xs,
    y0: ay,
    angle: ax.map((_, i) => Math.atan2((by[i] as number) - (ay[i] as number), (bx[i] as number) - (ax[i] as number))),
    length: ax.map((_, i) => Math.hypot((bx[i] as number) - (ax[i] as number), (by[i] as number) - (ay[i] as number))),
    radius: rad,
    tree: new Array(n).fill(0),
    birthId: ax.map((_, i) => i),
    order: new Array(n).fill(0),
    light,
    resource: new Array(n).fill(0),
    age,
    stress: new Array(n).fill(0),
    budMetamer: rosette.flatMap((r, i) => (r ? [i] : [])),
    budState: rosette.flatMap((r) => (r ? [BudState.shortShoot] : [])),
    budQ: rosette.flatMap((r, i) => (r ? [light[i] as number] : [])),
    species: s0.snap.species,
    metrics: [{ tree: 0, alive: true, species: "oak", rootX: 200, height: Math.max(...by), crownWidth: Math.max(...bx) - Math.min(...bx) }],
  };
  const leafy: number[] = [];
  for (let i = 0; i < n; i++) if ((age[i] as number) <= OAK_LEAF_AGE + 1 || rosette[i]) leafy.push(i);
  const seg: number[] = [];
  for (let i = 0; i < n; i++) {
    seg.push(
      (ax[i] as number) * CELL_M, (ay[i] as number) * CELL_M, (az[i] as number) * CELL_M,
      (bx[i] as number) * CELL_M, (by[i] as number) * CELL_M, (bz[i] as number) * CELL_M,
      (rad[i] as number) * CELL_M,
    );
  }
  return { snap, skel: { name, parent, seg, leafy }, n, tips, pipeRatio };
}

const variants = [
  { key: "open24", preset: "oakOpen" as const, seed0: 3, seasons: seasonAtHeight(3, 24) },
  { key: "open150", preset: "oakOpen" as const, seed0: 3, seasons: 150 },
  { key: "wood", preset: "oakWood" as const, seed0: 9, seasons: 150 },
  { key: "wood12", preset: "wood12" as const, seed0: 9, seasons: 150 },
];
const rows: string[] = ["variant,level,season,N,metamers,tips,trunkPipeRatio,growMs"];
for (const v of variants) {
  const slices: Slice[] = [];
  for (let k = 0; k < Math.max(...NS); k++) slices.push(grow(v.preset, v.seed0 + k, v.seasons));
  for (const [level, prefix] of [[1, "slices"], [2, "limbs"]] as const)
  for (const N of NS) {
    const name = `${prefix}-${v.key}-N${N}`;
    const c = compose(slices, N, name, level);
    // N = 1 is today's page: the slice's own snapshot (the renderer applies ADR 0008 to it).
    writeFileSync(join(out, `${name}.snap.json`), JSON.stringify(N === 1 ? (slices[0] as Slice).snap : c.snap));
    writeFileSync(join(out, `${name}.skel.json`), JSON.stringify(c.skel));
    const growMs = slices.slice(0, N).reduce((s, sl) => s + sl.growMs, 0);
    rows.push([v.key, level, v.seasons, N, c.n, c.tips, c.pipeRatio.toFixed(3), growMs.toFixed(0)].join(","));
    console.log(`${name}: season ${v.seasons}, ${c.n} metamers, ${c.tips} tips, trunk base r ×${c.pipeRatio.toFixed(2)} of slice 0's, grown in ${(growMs / 1000).toFixed(1)} s`);
  }
}
writeFileSync(join(out, "slices-cost.csv"), `${rows.join("\n")}\n`);
