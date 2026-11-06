/** The 3D prototype's stands beside today's view (docs/experiments/code/2026-10-29-proto3d). */
import type { Snapshot } from "../../../../src/core/snapshot.ts";
import { createRenderer } from "../../../../src/web/render/create.ts";
import { LEAF_STYLES } from "../../../../src/web/render/leaf-styles.ts";
import type { Renderer } from "../../../../src/web/render/renderer.ts";
import sceneTokens from "../../../../src/web/render/scene.css?inline";
import type { ViewOptions } from "../../../../src/web/render/scene.ts";
import { DEFAULTS, drawSlab } from "./slab-view.ts";

const style = document.createElement("style");
style.textContent = sceneTokens;
document.head.prepend(style);

const status = document.getElementById("status") as HTMLElement;
const form = document.getElementById("controls") as HTMLFormElement;
const view = {
  colorMode: "natural",
  showLeaves: true,
  depth: true,
  leafAge: LEAF_STYLES.broadleaf.leafAge,
  leafStyle: "broadleaf",
  showBuds: false,
  showShadow: false,
  showGhosts: false,
} as ViewOptions;
const make = (id: string): Renderer => {
  const r = createRenderer(document.getElementById(id) as HTMLCanvasElement, "auto");
  r.scene.frame = "world";
  return r;
};
const flat = make("flat");
const solid = make("solid");

const ARRAYS: Record<string, new (b: ArrayBuffer) => ArrayBufferView> = {
  Int32Array, Float32Array, Uint8Array, Float64Array,
};
async function load(name: string): Promise<{ s: Snapshot; z?: Float32Array }> {
  const res = await fetch(`./proto/stands/${name}.json.gz`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const text = await new Response(res.body?.pipeThrough(new DecompressionStream("gzip"))).text();
  const o = JSON.parse(text, (_k, v) => {
    if (v && typeof v === "object" && typeof v.t === "string" && typeof v.b === "string" && ARRAYS[v.t]) {
      const bin = atob(v.b);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new (ARRAYS[v.t] as new (b: ArrayBuffer) => ArrayBufferView)(bytes.buffer);
    }
    return v;
  });
  const z = o.z as Float32Array | undefined;
  delete o.z;
  // Trimmed for the deploy: a fresh snapshot has no previous rows.
  if (!o.prevIndex) o.prevIndex = new Int32Array(o.metamerCount).fill(-1);
  if (!o.resource) o.resource = new Float32Array(o.metamerCount);
  if (!o.stress) o.stress = new Float32Array(o.metamerCount);
  return { s: o as Snapshot, z };
}

const cache = new Map<string, Promise<{ s: Snapshot; z?: Float32Array }>>();
const get = (n: string) => {
  let p = cache.get(n);
  if (!p) cache.set(n, (p = load(n)));
  return p;
};

function show(r: Renderer, s: Snapshot, z?: Float32Array, D = 48): void {
  const c = r.canvas;
  c.style.height = `${Math.round(c.getBoundingClientRect().width * 0.62)}px`;
  r.resize();
  r.refreshTheme();
  r.scene.clearHistory();
  r.setSnapshot(s);
  r.scene.clearHistory();
  r.scene.depth = z === undefined;
  r.scene.fit(true);
  if (!z) r.draw(1, view);
  else if (r.kind === "webgl2") drawSlab(r, s, { ...DEFAULTS, model: "open", D, z });
}

const KIND: Record<string, string> = {
  "1": "hard", "0.5": "t050", "0.2": "t020", "0": "t000", edge: "edge", edge02: "edge02", fade: "fade",
};
const FACES: Record<string, string> = {
  edge: "τ 1 in front, 0 behind", edge02: "τ 1 in front, 0.2 behind", fade: "τ 1 with a 3-cell fade",
};

/** The stand file for a combination of controls (not every combination was grown). */
function names(f: FormData) {
  const rules = String(f.get("rules") ?? "");
  const D = Number(f.get("D"));
  const faces = String(f.get("faces"));
  const wide = f.get("spacing") === "42";
  const kind = wide ? (faces === "1" ? "wide" : "none") : KIND[faces];
  const label = `D ${D}, ${FACES[faces] ?? `τ ${faces}`}, ${wide ? 42 : 21}-cell spacing`;
  return { rules, D, flat: `2d${wide ? "-wide" : ""}${rules}`, cfg: `d${D}-${kind}${rules}`, label };
}

let current = "";
async function update(): Promise<void> {
  const f = new FormData(form);
  const { rules, D, flat: flatName, cfg, label } = names(f);
  // Without R6 the stands are frozen from season 40, so only season 100 was kept.
  const season = rules === "" ? 100 : Number(f.get("season"));
  const key = `${cfg}-s${season}`;
  current = key;
  status.textContent = `loading ${label}, season ${season}…`;
  try {
    const [a, b] = await Promise.all([get(`${flatName}-s${season}`), get(key)]);
    if (current !== key) return;
    show(flat, a.s);
    show(solid, b.s, b.z, D);
    (document.getElementById("label2d") as HTMLElement).textContent = `(${label.split(", ").at(-1)})`;
    (document.getElementById("label3d") as HTMLElement).textContent = `(${label})`;
    status.textContent = `season ${season}, ${label}: 2D ${a.s.metamerCount} metamers; 3D ${b.s.metamerCount}. Renderer ${solid.kind}.`;
  } catch (e) {
    cache.delete(key);
    status.textContent = `not grown: ${label}${rules ? "" : ", C1–C6 and R1 only"} (${(e as Error).message}). Grown with R6: τ 1, 0.5, 0.2, 0 and the wood edge at D 48 and 64; τ 1 in front and 0.2 behind at D 64; 42-cell spacing at τ 1, D 48 and 64; D 32 at τ 1; the fade at D 32 and 48. Without R6: D 32 and 48 at τ 1, D 32 faded.`;
  }
}
form.addEventListener("change", () => void update());
let timer = 0;
window.addEventListener("resize", () => {
  clearTimeout(timer);
  timer = window.setTimeout(() => void update(), 150);
});
void update();
