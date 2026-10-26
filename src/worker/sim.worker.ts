/**
 * The simulation runs here, off the main thread. The page drives it through Comlink and asks
 * for one season at a time (pull model), so work never queues up behind the animation.
 */

import * as Comlink from "comlink";
import { defaultParams, type Params, type ParamsPatch } from "../core/params.ts";
import { type Snapshot, SnapshotBuilder, transferables } from "../core/snapshot.ts";
import { World } from "../core/world.ts";
import type { SimApi } from "./api.ts";

let world = new World(defaultParams);
const builder = new SnapshotBuilder();

function snapshot(ms: number): Snapshot {
  const s = builder.build(world, ms);
  return Comlink.transfer(s, transferables(s));
}

const api: SimApi = {
  init(params: Params) {
    world = new World(params);
    builder.reset();
    return snapshot(0);
  },
  step(seasons: number) {
    const t0 = performance.now();
    for (let i = 0; i < seasons; i++) world.step();
    return snapshot((performance.now() - t0) / Math.max(1, seasons));
  },
  setParams(patch: ParamsPatch) {
    world.setParams(patch);
  },
  removeTree(tree: number) {
    world.removeTree(tree);
  },
  record() {
    return world.record();
  },
};

Comlink.expose(api);
