/** One lane of the G3 kernel: its own WASM instance and copy of the stand, its share of the sky. */
import { load, sweep } from "./g3-shared.ts";

let s: ReturnType<typeof sweep> | null = null;
self.onmessage = async (ev: MessageEvent) => {
  const m = ev.data;
  if (m.type === "init") {
    await load();
    s?.free();
    s = sweep(new Float64Array(m.buds), m.tau, m.K, true);
    self.postMessage({ type: "ready" });
  } else if (m.type === "run" && s) {
    const t0 = performance.now();
    s.compute_part(m.season, m.lane, m.lanes);
    self.postMessage({ type: "done", ms: performance.now() - t0 });
  }
};
