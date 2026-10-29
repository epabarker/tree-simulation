/**
 * The simulation runs here, off the main thread, in the Rust core (I1, ADR 0024: the production
 * build, the same bits in every browser). The page drives it through Comlink and asks for one
 * season at a time (pull model), so work never queues up behind the animation. Dead trees are
 * discarded as they die, so the world's hash here is not the CLI's. The WASM module loads when
 * the worker starts, after the page's first paint; every call waits for it.
 */

import * as Comlink from "comlink";
import { defaultParams, type Params, type ParamsPatch } from "../core/params.ts";
import { FULL_SNAPSHOT, type Snapshot, type SnapshotOptions } from "../core/types.ts";
import { loadWorlds, RustWorld, snapshotTransferables } from "../wasm/world.ts";
import type { SimApi } from "./api.ts";

const ready = loadWorlds();
let world: RustWorld | null = null;
/** The world put aside by `swap`, if any. */
let aside: RustWorld | null = null;
let options: SnapshotOptions = FULL_SNAPSHOT;

async function current(): Promise<RustWorld> {
  await ready;
  world ??= RustWorld.create(defaultParams);
  return world;
}

function snapshot(w: RustWorld, ms: number): Snapshot {
  const t0 = performance.now();
  const s = w.snapshot(ms, options);
  s.snapshotMs = performance.now() - t0;
  return Comlink.transfer(s, snapshotTransferables(s));
}

function replace(next: RustWorld): RustWorld {
  world?.dispose();
  aside?.dispose();
  aside = null;
  world = next;
  return next;
}

const api: SimApi = {
  async init(params: Params) {
    await ready;
    return snapshot(replace(RustWorld.create(params)), 0);
  },
  async restore(gzipped: ArrayBuffer) {
    await ready;
    // A server may already have undone the gzip (Content-Encoding): only unzip gzip's own bytes.
    const head = new Uint8Array(gzipped, 0, Math.min(2, gzipped.byteLength));
    let bytes = gzipped;
    if (head[0] === 0x1f && head[1] === 0x8b) {
      const stream = new Blob([gzipped]).stream().pipeThrough(new DecompressionStream("gzip"));
      bytes = await new Response(stream).arrayBuffer();
    }
    return snapshot(replace(RustWorld.load(new Uint8Array(bytes))), 0);
  },
  async swap(params: Params | null) {
    const w = await current();
    if (params) {
      if (aside) w.dispose();
      else aside = w;
      world = RustWorld.create(params);
    } else if (aside) {
      w.dispose();
      world = aside;
      aside = null;
    }
    const now = world as RustWorld;
    now.resetSnapshots();
    return snapshot(now, 0);
  },
  async step(seasons: number) {
    const w = await current();
    const t0 = performance.now();
    // A page can run for hours; the dead trees a forest piles up are never drawn again.
    w.step(seasons, true);
    return snapshot(w, (performance.now() - t0) / Math.max(1, seasons));
  },
  setSnapshotOptions(next: SnapshotOptions) {
    options = next;
  },
  async setParams(patch: ParamsPatch) {
    (await current()).setParams(patch);
  },
  async removeTree(tree: number) {
    (await current()).removeTree(tree);
  },
  async plantTree(x: number) {
    (await current()).plantTree(x);
  },
  async record() {
    return (await current()).record();
  },
};

Comlink.expose(api);
