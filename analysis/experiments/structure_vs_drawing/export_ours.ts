/**
 * Structure vs drawing (2×2): grows our oaks and writes, for one oak per run,
 *   <name>.snap.json  a one-tree Snapshot for our renderer (renderer A), exactly as the page gets it;
 *   <name>.skel.json  a 3D skeleton in metres for the better renderer (renderer B).
 * The 3D reading follows ADR 0008: each first-order limb, with its subtree, is turned rigidly out
 * of the plane about its parent's axis by the page's own stable azimuth φ (hash01 salt 1), turned by
 * acos(0.55 + 0.45|sin φ|) so the front view matches the page; nothing else moves. A cell is
 * 0.25 m (leaf-styles.ts, M23).
 *
 *   node analysis/experiments/structure_vs_drawing/export_ours.ts runs/structure-vs-drawing/data
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { presetParams } from "../../../src/core/presets.ts";
import { SnapshotBuilder } from "../../../src/core/snapshot.ts";
import { BudState } from "../../../src/core/tree.ts";
import { World } from "../../../src/core/world.ts";

const CELL_M = 0.25;
const OAK_LEAF_AGE = 5; // LEAF_STYLES.oak.leafAge
const out = process.argv[2] ?? ".";

function hash01(tree: number, birthId: number, salt: number): number {
  let h = Math.imul(birthId ^ (tree << 20) ^ (salt << 27), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const runs = [
  { name: "ours-open", preset: "oakOpen" as const, seasons: 150, seed: 3 },
  { name: "ours-wood", preset: "oakWood" as const, seasons: 200, seed: 9 },
];

for (const run of runs) {
  const world = new World(presetParams(run.preset, run.seed));
  world.run(run.seasons);
  const s = new SnapshotBuilder().build(world, 0, { junctions: false, field: false });
  // The oak with the biggest crown (height × width).
  const oaks = s.metrics.filter((m) => m.alive && m.species === "oak");
  if (oaks.length === 0) throw new Error(`${run.name}: no live oak at season ${run.seasons}`);
  oaks.sort((a, b) => b.height * b.crownWidth - a.height * a.crownWidth);
  const pick = oaks[0];
  if (!pick) throw new Error("unreachable");
  const id = pick.tree;

  // Rows of that tree, remapped.
  const rows: number[] = [];
  const map = new Int32Array(s.metamerCount).fill(-1);
  for (let j = 0; j < s.metamerCount; j++) {
    if (s.tree[j] === id) {
      map[j] = rows.length;
      rows.push(j);
    }
  }
  const pick1 = <T extends ArrayLike<number>>(a: T) => rows.map((j) => a[j] as number);
  const buds: number[] = [];
  for (let i = 0; i < s.budCount; i++) if (s.tree[s.budMetamer[i] as number] === id) buds.push(i);
  const snap = {
    season: s.season,
    width: s.width,
    height: s.height,
    metamerCount: rows.length,
    parent: rows.map((j) => (s.parent[j] as number) >= 0 ? map[s.parent[j] as number] : -1),
    x0: pick1(s.x0),
    y0: pick1(s.y0),
    angle: pick1(s.angle),
    length: pick1(s.length),
    radius: pick1(s.radius),
    tree: pick1(s.tree),
    birthId: pick1(s.birthId),
    order: pick1(s.order),
    light: pick1(s.light),
    resource: pick1(s.resource),
    age: pick1(s.age),
    stress: pick1(s.stress),
    budMetamer: buds.map((i) => map[s.budMetamer[i] as number]),
    budState: buds.map((i) => s.budState[i] as number),
    budQ: buds.map((i) => s.budQ[i] as number),
    species: s.species,
    metrics: [pick],
  };
  writeFileSync(join(out, `${run.name}.snap.json`), JSON.stringify(snap));

  // 3D skeleton. Planar tips first (parent-before-child), then the ADR 0008 limb turns.
  const n = rows.length;
  const bx = new Float64Array(n);
  const by = new Float64Array(n);
  const tx = new Float64Array(n);
  const ty = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = snap.parent[i] as number;
    bx[i] = p >= 0 ? (tx[p] as number) : (snap.x0[i] as number);
    by[i] = p >= 0 ? (ty[p] as number) : (snap.y0[i] as number);
    tx[i] = (bx[i] as number) + (snap.length[i] as number) * Math.cos(snap.angle[i] as number);
    ty[i] = (by[i] as number) + (snap.length[i] as number) * Math.sin(snap.angle[i] as number);
  }
  // Per metamer: the rigid turn of its limb, as a 3×3 rotation R and pivot J (identity on the trunk).
  const R = new Float64Array(9 * n);
  const J = new Float64Array(3 * n);
  const rotate = (m: Float64Array, k: number, v: number[]) => [
    (m[k] as number) * (v[0] as number) + (m[k + 1] as number) * (v[1] as number) + (m[k + 2] as number) * (v[2] as number),
    (m[k + 3] as number) * (v[0] as number) + (m[k + 4] as number) * (v[1] as number) + (m[k + 5] as number) * (v[2] as number),
    (m[k + 6] as number) * (v[0] as number) + (m[k + 7] as number) * (v[1] as number) + (m[k + 8] as number) * (v[2] as number),
  ];
  for (let i = 0; i < n; i++) {
    const p = snap.parent[i] as number;
    const o = snap.order[i] as number;
    if (p >= 0 && o > (snap.order[p] as number) && (snap.order[p] as number) === 0) {
      // Rodrigues rotation about the parent's (in-plane) axis u by φ, pivot at the junction.
      const a = snap.angle[p] as number;
      const u = [Math.cos(a), Math.sin(a), 0];
      const phi = 2 * Math.PI * hash01(snap.tree[i] as number, snap.birthId[i] as number, 1);
      // The page's softened squeeze (MIN_SPREAD 0.55): seen from the front the limb spreads by
      // 0.55 + 0.45·|sin φ|, exactly as the page draws it, and leans toward depth sign cos φ.
      const squeeze = 0.55 + 0.45 * Math.abs(Math.sin(phi));
      const turn = Math.sign(Math.cos(phi)) * Math.acos(squeeze);
      const c = Math.cos(turn);
      const sn = Math.sin(turn);
      const [x, y, z] = u as [number, number, number];
      const m = [
        c + x * x * (1 - c), x * y * (1 - c) - z * sn, x * z * (1 - c) + y * sn,
        y * x * (1 - c) + z * sn, c + y * y * (1 - c), y * z * (1 - c) - x * sn,
        z * x * (1 - c) - y * sn, z * y * (1 - c) + x * sn, c + z * z * (1 - c),
      ];
      R.set(m, 9 * i);
      J.set([bx[i] as number, by[i] as number, 0], 3 * i);
    } else if (p >= 0) {
      R.copyWithin(9 * i, 9 * p, 9 * p + 9);
      J.copyWithin(3 * i, 3 * p, 3 * p + 3);
    } else {
      R.set([1, 0, 0, 0, 1, 0, 0, 0, 1], 9 * i);
    }
  }
  const place = (i: number, x: number, y: number) => {
    const j = [J[3 * i] as number, J[3 * i + 1] as number, J[3 * i + 2] as number];
    const v = rotate(R, 9 * i, [x - (j[0] as number), y - (j[1] as number), -(j[2] as number)]);
    return v.map((q, k) => (q + (j[k] as number)) * CELL_M);
  };
  const rootX = snap.x0[0] as number;
  const seg: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = place(i, bx[i] as number, by[i] as number);
    const b = place(i, tx[i] as number, ty[i] as number);
    // Metres, y up, x centred on the root.
    seg.push(
      (a[0] as number) - rootX * CELL_M, a[1] as number, a[2] as number,
      (b[0] as number) - rootX * CELL_M, b[1] as number, b[2] as number,
      (snap.radius[i] as number) * CELL_M,
    );
  }
  // Leaf sites: shoots young enough to carry leaves (the page's rule), and short-shoot rosettes.
  const leafy: number[] = [];
  for (let i = 0; i < n; i++) if ((snap.age[i] as number) <= OAK_LEAF_AGE + 1) leafy.push(i);
  for (let k = 0; k < snap.budState.length; k++) {
    const m = snap.budMetamer[k] as number;
    if (snap.budState[k] === BudState.shortShoot && (snap.age[m] as number) > OAK_LEAF_AGE + 1) {
      leafy.push(m);
    }
  }
  writeFileSync(
    join(out, `${run.name}.skel.json`),
    JSON.stringify({ name: run.name, source: `${run.preset} seed ${run.seed} season ${run.seasons}, tree ${id}`, parent: snap.parent, seg, leafy }),
  );
  console.log(
    `${run.name}: tree ${id}, ${n} metamers, height ${(pick.height * CELL_M).toFixed(1)} m, crown ${(pick.crownWidth * CELL_M).toFixed(1)} m, trunk r ${(pick.trunkRadius * CELL_M * 100).toFixed(1)} cm, leaf sites ${leafy.length}`,
  );
}
