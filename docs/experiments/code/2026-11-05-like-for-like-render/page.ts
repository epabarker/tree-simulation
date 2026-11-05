// The like-for-like sheet (bundled by render.mjs; adapted from 2026-11-05-render): every panel one tree from a cylinder
// table (export.py's sim.json and qsm.json), drawn by the garden's own renderer through qsmSnapshot; the real
// QSMs (qsm.json, qsm_export.py) are converted to the same Snapshot, so renderer, camera and palette are shared.
import { createRenderer } from "../../../../src/web/render/create.ts";
import { LEAF_STYLES } from "../../../../src/web/render/leaf-styles.ts";
import type { Renderer } from "../../../../src/web/render/renderer.ts";
import type { ViewOptions } from "../../../../src/web/render/scene.ts";

const CELL = 0.25; // metres per cell (the core's)
type Snap = Record<string, any>;

async function loadSnap(name: string): Promise<Snap> {
  const [head, bin] = await Promise.all([
    fetch(`${name}.json`).then((r) => r.json()),
    fetch(`${name}.bin`).then((r) => r.arrayBuffer()),
  ]);
  const ctors: Record<string, any> = { Float32Array, Float64Array, Int32Array, Uint8Array };
  const s: Snap = {};
  for (const [k, v] of Object.entries<any>(head)) s[k] = "v" in v ? v.v : new ctors[v.t](bin, v.off, v.len);
  return s;
}

/**
 * A real QSM (metres, z up) as a Snapshot: one tree, rooted at the world's middle. A cylinder with children
 * along its length is cut at each branch point (so a lateral hangs where it really leaves the stem, as the renderer
 * starts a child at its parent's tip). x → x, z (up) → y, y → depth. `age` is a stand-in for the bark colour (the
 * natural palette reads age and girth; a QSM has no age): 1 + 600·r seasons, r in metres, capped at 100.
 */
function qsmSnapshot(q: any, template: Snap, W: number): Snap {
  const n = q.parent.length;
  const kids: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) if (q.parent[i] >= 0) kids[q.parent[i]]!.push(i);
  const f = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = q.parent[i];
    if (p < 0) continue;
    const a = q.axis[p], s = q.start[p], c = q.start[i];
    f[i] = ((c[0] - s[0]) * a[0] + (c[1] - s[1]) * a[1] + (c[2] - s[2]) * a[2]) / q.length[p];
  }
  const rows = { parent: [] as number[], bx: [] as number[], by: [] as number[], bz: [] as number[], ax: [] as number[],
    ay: [] as number[], az: [] as number[], len: [] as number[], r: [] as number[] };
  const pieceRows: number[][] = new Array(n);
  const cutOf = new Int32Array(n);
  let zMin = Infinity;
  for (let i = 0; i < n; i++) zMin = Math.min(zMin, q.start[i][2]);
  const root = q.start[q.parent.indexOf(-1)];
  for (let i = 0; i < n; i++) {
    const fs = kids[i]!.map((c) => [Math.min(1, Math.max(0.03, f[c]!)), c] as const).sort((a, b) => a[0] - b[0]);
    const cuts: number[] = [];
    for (const [fc, c] of fs) {
      if (fc > 0.97) { if (cuts[cuts.length - 1] !== 1) cuts.push(1); cutOf[c] = cuts.length - 1; continue; }
      if (cuts.length === 0 || fc - cuts[cuts.length - 1]! > 0.03) cuts.push(fc);
      cutOf[c] = cuts.length - 1;
    }
    if (cuts[cuts.length - 1] !== 1) cuts.push(1);
    pieceRows[i] = [];
    for (let k = 0; k < cuts.length; k++) {
      const f0 = k === 0 ? 0 : cuts[k - 1]!;
      const row = rows.len.length;
      const p = q.parent[i];
      rows.parent.push(k > 0 ? row - 1 : p < 0 ? -1 : pieceRows[p]![cutOf[i]!]!);
      for (let d = 0; d < 3; d++) (d === 0 ? rows.bx : d === 1 ? rows.by : rows.bz).push(q.start[i][d] + q.axis[i][d] * q.length[i] * f0);
      rows.ax.push(q.axis[i][0]); rows.ay.push(q.axis[i][1]); rows.az.push(q.axis[i][2]);
      rows.len.push(q.length[i] * (cuts[k]! - f0));
      rows.r.push(q.radius[i]);
      pieceRows[i]!.push(row);
    }
  }
  const m = rows.len.length;
  const f32 = (g: (j: number) => number) => Float32Array.from({ length: m }, (_, j) => g(j));
  const D = 64;
  const z0 = f32((j) => (rows.by[j]! - root[1]) / CELL + D / 2);
  const zOrder = Int32Array.from({ length: m }, (_, j) => j).sort((a, b) => z0[b]! - z0[a]! || a - b);
  let top = 0;
  for (let j = 0; j < m; j++) top = Math.max(top, (rows.bz[j]! - zMin + rows.az[j]! * rows.len[j]!) / CELL);
  const metrics = [{ ...template.metrics[0], tree: 0, alive: true, rootX: W / 2, height: top, limbBase: 0, boleHeight: 0 }];
  return {
    ...template, season: 0, width: W, height: 200, depth: D, periodic: false, storm: false, metamerCount: m, metrics,
    parent: Int32Array.from(rows.parent),
    x0: f32((j) => (rows.bx[j]! - root[0]) / CELL + W / 2), y0: f32((j) => (rows.bz[j]! - zMin) / CELL),
    angle: f32((j) => Math.atan2(rows.az[j]!, rows.ax[j]!)),
    length: f32((j) => (rows.len[j]! / CELL) * Math.hypot(rows.ax[j]!, rows.az[j]!)),
    radius: f32((j) => rows.r[j]! / CELL), z0,
    dirX: f32((j) => rows.ax[j]!), dirY: f32((j) => rows.az[j]!), dirZ: f32((j) => rows.ay[j]!),
    tree: new Int32Array(m), birthId: Int32Array.from({ length: m }, (_, j) => j), order: new Uint8Array(m),
    light: f32(() => 0.5), resource: new Float32Array(m), age: f32((j) => Math.min(100, 1 + 600 * rows.r[j]!)),
    stress: new Float32Array(m), prevIndex: new Int32Array(m).fill(-1), zOrder,
    budCount: 0, budMetamer: new Int32Array(0), budState: new Uint8Array(0), budQ: new Float32Array(0),
    shadow: null, walls: [], obstacles: [], junctions: new Float32Array(0),
  };
}

interface Cam { cx: number; scale: number }

function drawPanel(r: Renderer, s: Snap, cam: Cam, leaves: boolean, into: HTMLCanvasElement): void {
  const sc: any = r.scene;
  r.setSnapshot(s as never);
  sc.clearHistory();
  sc.frame = "height";
  sc.headroom = 0;
  sc.seasons = false;
  sc.fit(true);
  sc.camera.cx = cam.cx;
  sc.camera.scale = cam.scale;
  sc.target = { cx: cam.cx, scale: cam.scale };
  sc.pinGround();
  const view: ViewOptions = {
    colorMode: "natural", showLeaves: leaves, leafAge: LEAF_STYLES.beech.leafAge, leafStyle: "beech",
    showBuds: false, showShadow: false, showGhosts: false,
  };
  r.draw(1, view);
  into.width = r.canvas.width;
  into.height = r.canvas.height;
  into.getContext("2d")!.drawImage(r.canvas, 0, 0);
}

interface Spec { rows: { key: string; title: string }[]; stand: { w: number; h: number }; seed: number }

(window as any).run = async (spec: Spec) => {
  const el = (tag: string, cls?: string, text?: string) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const sheet = document.getElementById("sheet")!;
  const standCanvas = el("canvas") as HTMLCanvasElement;
  standCanvas.style.cssText = `width:${spec.stand.w}px;height:${spec.stand.h}px;position:absolute;left:0;top:0`;
  document.body.append(standCanvas);
  const standR = createRenderer(standCanvas, "auto");
  const standCam: Cam = { cx: 42, scale: spec.stand.w / 84 };
  sheet.append(el("h1", "", "Beech like for like: simulated trees coarsened at BioDiv's d_min and drawn as cylinders, beside nine BioDiv QSMs at crownBase80's deciles"));
  sheet.append(el("p", "note", `Every panel one tree, drawn from its cylinder table by the same path (the QSM path), the same renderer (${standR.kind}), camera and palette: ${(spec.stand.w / standCam.scale * CELL).toFixed(0)} m wide, ${(spec.stand.h / standCam.scale * CELL).toFixed(0)} m tall, leaf-off. Simulated: seed ${spec.seed}, the closed stand's four measured trees at season 70, coarsened as registration v5's sim_rule (inflate, prune at 8.6 mm). Real: TreeQSM's optimum model, raw cylinders; deciles of the 53 trees' crownBase80 (median over repeats). Captions: crownBase80 and boleSway of the tree as drawn.`));
  const grid = el("div", "grid");
  sheet.append(grid);
  const panel = (canvas: HTMLCanvasElement, l1: string, l2: string) => {
    const p = el("div", "panel");
    p.append(el("div", "cap", l1), el("div", "cap2", l2));
    canvas.style.cssText = `width:${spec.stand.w}px;height:${spec.stand.h}px;display:block`;
    p.append(canvas);
    return p;
  };
  const tmpl = await loadSnap(`./template-lone-${spec.seed}`);
  const sim = await fetch("sim.json").then((r) => r.json());
  const qsm = await fetch("qsm.json").then((r) => r.json());
  const f2 = (x: number) => (x === null || !Number.isFinite(x) ? "–" : x.toFixed(2));
  const f3 = (x: number) => (x === null || !Number.isFinite(x) ? "–" : x.toFixed(3));
  for (const row of spec.rows) {
    grid.append(el("div", "rowhead", row.title));
    const trees = row.key === "real" ? qsm : sim[row.key];
    for (const q of trees) {
      const out = el("canvas") as HTMLCanvasElement;
      drawPanel(standR, qsmSnapshot(q, tmpl, 84), standCam, false, out);
      const l1 = row.key === "real" ? `decile ${q.decile} · BioDiv ${q.tree}` : q.tree;
      const dbh = row.key === "real" ? q.dbhMeasured : q.dbh;
      const l2 = `crownBase80 ${f2(q.crownBase80)} · boleSway ${f3(q.boleSway)} · DBH ${dbh.toFixed(2)} m · H ${q.height.toFixed(1)} m`;
      grid.append(panel(out, l1, l2));
    }
    for (let k = trees.length; k < 9; k++) grid.append(el("div"));
  }
  standCanvas.remove();
  (window as any).done = true;
};
