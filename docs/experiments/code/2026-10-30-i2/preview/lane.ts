/** One light lane (G3's model): its own instance and sweep, every fourth sky direction. */
import init, { SlabSweep } from "../../../../../src/wasm/pkg/core.js";

let sweep: SlabSweep | null = null;
let memory: WebAssembly.Memory | null = null;
let dims = [0, 0, 0];

self.onmessage = async (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "init") {
    memory = (await init()).memory;
    const p = m.params;
    dims = [p.w, p.h, p.d];
    sweep = new SlabSweep(p.w, p.h, p.d, p.K, p.kExt, p.skyExponent, p.minElevation, p.C, p.rotate, p.faces[0], p.faces[1], p.periodic);
    self.postMessage({ type: "ready" });
    return;
  }
  if (m.type === "run" && sweep && memory) {
    const n = dims[0] * dims[1] * dims[2];
    new Float32Array(memory.buffer, sweep.lad_ptr(), n).set(m.lad as Float32Array);
    sweep.refresh_top();
    const t0 = performance.now();
    sweep.compute_part(m.season, m.lane, m.lanes);
    self.postMessage({ type: "done", ms: performance.now() - t0, top: sweep.top() });
  }
};
