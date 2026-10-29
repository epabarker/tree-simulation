/** One lane of the lane-parallel kernel: its own WASM instance, its share of the directions. */
import { type Exports, instance, setup } from "./kernel-shared.ts";

let e: Exports | null = null;
self.onmessage = async (ev: MessageEvent) => {
  const m = ev.data;
  if (m.type === "init") {
    e = await instance(m.wasm);
    const lad = m.lad instanceof SharedArrayBuffer ? new Float32Array(m.lad) : new Float32Array(m.lad);
    setup(e, lad, m.top, m.periodicZ, true);
    self.postMessage({ type: "ready" });
  } else if (m.type === "run" && e) {
    const t0 = performance.now();
    e.compute32simd_lane(m.lane, m.lanes);
    self.postMessage({ type: "done", ms: performance.now() - t0 });
  }
};
