/** G0.5 preview page: loads a grown stand and draws it three ways (see slab-view.ts). */
import { loadWorld } from "../../../../src/core/checkpoint.ts";
import { type Snapshot, SnapshotBuilder } from "../../../../src/core/snapshot.ts";
import { createRenderer } from "../../../../src/web/render/create.ts";
import { LEAF_STYLES } from "../../../../src/web/render/leaf-styles.ts";
import type { Renderer } from "../../../../src/web/render/renderer.ts";
import sceneTokens from "../../../../src/web/render/scene.css?inline";
import type { ViewOptions } from "../../../../src/web/render/scene.ts";
import { DEFAULTS, drawSlab, type ZModel } from "./slab-view.ts";

const style = document.createElement("style");
style.textContent = sceneTokens;
document.head.prepend(style);

const status = document.getElementById("status") as HTMLElement;
const form = document.getElementById("controls") as HTMLFormElement;
const view: ViewOptions = {
  colorMode: "natural",
  showLeaves: true,
  depth: true,
  leafAge: LEAF_STYLES.broadleaf.leafAge,
  leafStyle: "broadleaf",
  showBuds: false,
  showShadow: false,
  showGhosts: false,
} as ViewOptions;

const panels: { id: string; model: ZModel | null; renderer: Renderer }[] = [
  ["today", null],
  ["open", "open"],
  ["periodic", "periodic"],
].map(([id, model]) => {
  const canvas = document.getElementById(id as string) as HTMLCanvasElement;
  const renderer = createRenderer(canvas, "auto");
  renderer.scene.frame = "world";
  return { id: id as string, model: model as ZModel | null, renderer };
});

const cache = new Map<string, Snapshot>();
let current: Snapshot | null = null;
let width = 66;

async function stand(w: number, seed: number, season: number): Promise<Snapshot> {
  const key = `${w}-${seed}-${season}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`./stands/${key}.bin.gz`);
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  const stream = res.body?.pipeThrough(new DecompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const s = new SnapshotBuilder().build(loadWorld(bytes), 0);
  cache.set(key, s);
  return s;
}

function layout(): void {
  document.body.classList.toggle("narrow", width < 200);
  for (const p of panels) {
    const c = p.renderer.canvas;
    const cssW = c.getBoundingClientRect().width;
    c.style.height = `${Math.round(cssW * (width < 200 ? 1.45 : 0.42))}px`;
  }
}

function draw(): void {
  const s = current;
  if (!s) return;
  layout();
  for (const p of panels) {
    const r = p.renderer;
    r.resize();
    r.refreshTheme();
    r.scene.clearHistory();
    r.setSnapshot(s);
    r.scene.clearHistory();
    r.scene.depth = p.model === null;
    r.scene.fit(true);
    if (p.model === null) r.draw(1, view);
    else if (r.kind === "webgl2") drawSlab(r, s, { ...DEFAULTS, model: p.model });
  }
}

async function update(): Promise<void> {
  const f = new FormData(form);
  width = Number(f.get("width"));
  const seed = Number(f.get("seed"));
  const season = Number(f.get("season"));
  status.textContent = `loading ${width}-cell ring, seed ${seed}, season ${season}…`;
  try {
    current = await stand(width, seed, season);
    draw();
    const kind = panels[0]?.renderer.kind;
    status.textContent =
      `${width}-cell ring, seed ${seed}, season ${season}: ${current.metamerCount} metamers, ` +
      `${current.metrics.length} trees. Renderer ${kind}. crossOriginIsolated: ${self.crossOriginIsolated}.`;
    if (kind !== "webgl2") status.textContent += " (No WebGL2: the slab panels need it.)";
  } catch (e) {
    status.textContent = `failed: ${(e as Error).message}`;
  }
}

form.addEventListener("change", () => void update());
let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(draw, 150);
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
void update();
