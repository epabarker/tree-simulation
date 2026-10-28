/**
 * The simulation runs here, off the main thread. The page drives it through Comlink and asks
 * for one season at a time (pull model), so work never queues up behind the animation. Dead
 * trees are discarded as they die (World.discardDead), so the world's hash here is not the CLI's.
 */

import * as Comlink from "comlink";
import { loadWorld } from "../core/checkpoint.ts";
import { defaultParams, type Params, type ParamsPatch } from "../core/params.ts";
import {
  FULL_SNAPSHOT,
  type Snapshot,
  SnapshotBuilder,
  type SnapshotOptions,
  transferables,
} from "../core/snapshot.ts";
import { World } from "../core/world.ts";
import type { SimApi } from "./api.ts";

let world = new World(defaultParams);
/** The world put aside by `swap`, if any. */
let aside: World | null = null;
const builder = new SnapshotBuilder();
let options: SnapshotOptions = FULL_SNAPSHOT;

function snapshot(ms: number): Snapshot {
  const t0 = performance.now();
  const s = builder.build(world, ms, options);
  s.snapshotMs = performance.now() - t0;
  return Comlink.transfer(s, transferables(s));
}

const api: SimApi = {
  init(params: Params) {
    world = new World(params);
    aside = null;
    builder.reset();
    return snapshot(0);
  },
  async restore(gzipped: ArrayBuffer) {
    // A server may already have undone the gzip (Content-Encoding): only unzip gzip's own bytes.
    const head = new Uint8Array(gzipped, 0, Math.min(2, gzipped.byteLength));
    let bytes = gzipped;
    if (head[0] === 0x1f && head[1] === 0x8b) {
      const stream = new Blob([gzipped]).stream().pipeThrough(new DecompressionStream("gzip"));
      bytes = await new Response(stream).arrayBuffer();
    }
    world = loadWorld(new Uint8Array(bytes));
    aside = null;
    builder.reset();
    return snapshot(0);
  },
  swap(params: Params | null) {
    if (params) {
      aside ??= world;
      world = new World(params);
    } else if (aside) {
      world = aside;
      aside = null;
    }
    builder.reset();
    return snapshot(0);
  },
  step(seasons: number) {
    const t0 = performance.now();
    for (let i = 0; i < seasons; i++) {
      world.step();
      // A page can run for hours; the dead trees a forest piles up are never drawn again.
      world.discardDead();
    }
    return snapshot((performance.now() - t0) / Math.max(1, seasons));
  },
  setSnapshotOptions(next: SnapshotOptions) {
    options = next;
  },
  setParams(patch: ParamsPatch) {
    world.setParams(patch);
  },
  removeTree(tree: number) {
    world.removeTree(tree);
  },
  plantTree(x: number) {
    world.plantTree(x);
  },
  record() {
    return world.record();
  },
};

Comlink.expose(api);
