/** G1 page: times the slab kernel single-threaded (TS, WASM scalar, WASM SIMD) and in 4 lanes. */
import { SlabSweep } from "../../../../cli/slab-light.ts";
import { C2, D, field, H, instance, K, setup, W } from "./kernel-shared.ts";

const env = document.getElementById("env") as HTMLElement;
const tbody = document.querySelector("#out tbody") as HTMLElement;
const verdict = document.getElementById("verdict") as HTMLElement;
const json = document.getElementById("json") as HTMLElement;
const button = document.getElementById("run") as HTMLButtonElement;
const info = {
  userAgent: navigator.userAgent,
  cores: navigator.hardwareConcurrency,
  crossOriginIsolated: self.crossOriginIsolated,
  simd: WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])),
};
env.textContent = `cores ${info.cores}; crossOriginIsolated ${info.crossOriginIsolated}; WASM SIMD ${info.simd}`;
const results: { kernel: string; z: string; median: number; min: number; runs: number }[] = [];

const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number;
function row(kernel: string, z: string, t: number[]): void {
  const r = { kernel, z, median: +med(t).toFixed(1), min: +Math.min(...t).toFixed(1), runs: t.length };
  results.push(r);
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${kernel}</td><td>${z}</td><td>${r.median}</td><td>${r.min}</td><td>${r.runs}</td>`;
  tbody.append(tr);
  json.textContent = JSON.stringify({ ...info, results }, null, 1);
}
const pause = () => new Promise((r) => setTimeout(r, 30));
async function time(fn: () => void, reps: number): Promise<number[]> {
  fn(); // warm-up
  const t: number[] = [];
  for (let i = 0; i < reps; i++) {
    await pause();
    const t0 = performance.now();
    fn();
    t.push(performance.now() - t0);
  }
  return t;
}

async function lanes(wasm: ArrayBuffer, lad: Float32Array, top: number, periodicZ: boolean, n: number, reps: number): Promise<number[]> {
  let shared: ArrayBufferLike = lad.buffer;
  if (self.crossOriginIsolated) {
    const sab = new SharedArrayBuffer(lad.byteLength);
    new Float32Array(sab).set(lad);
    shared = sab;
  }
  const workers = Array.from({ length: n }, () => new Worker(new URL("./kernel-worker.ts", import.meta.url), { type: "module" }));
  const reply = (w: Worker, type: string) =>
    new Promise<{ ms: number }>((res) => {
      const h = (ev: MessageEvent) => {
        if (ev.data.type === type) {
          w.removeEventListener("message", h);
          res(ev.data);
        }
      };
      w.addEventListener("message", h);
    });
  await Promise.all(
    workers.map((w) => {
      const p = reply(w, "ready");
      w.postMessage({ type: "init", wasm, lad: shared instanceof SharedArrayBuffer ? shared : lad.slice().buffer, top, periodicZ });
      return p;
    }),
  );
  const t: number[] = [];
  for (let i = 0; i <= reps; i++) {
    await pause();
    const t0 = performance.now();
    await Promise.all(workers.map((w, lane) => { const p = reply(w, "done"); w.postMessage({ type: "run", lane, lanes: n }); return p; }));
    if (i > 0) t.push(performance.now() - t0);
  }
  for (const w of workers) w.terminate();
  return t;
}

async function run(): Promise<void> {
  button.disabled = true;
  results.length = 0;
  tbody.textContent = "";
  verdict.textContent = "running…";
  const dep = new Float64Array(await (await fetch("./kernel/dep-forest.bin")).arrayBuffer());
  const scalar = await (await fetch("./kernel/slab-scalar.wasm")).arrayBuffer();
  const simd = await (await fetch("./kernel/slab-simd.wasm")).arrayBuffer();
  for (const periodicZ of [false, true]) {
    const z = periodicZ ? "periodic" : "open";
    const { lad, top } = field(dep, periodicZ);
    if (!periodicZ) {
      const ts = new SlabSweep(W, H, D, { ...C2 } as never, K, true, periodicZ, Float32Array, true);
      ts.lad.set(lad);
      (ts as unknown as { top: number }).top = top;
      row("TypeScript (fused)", z, await time(() => ts.compute(), 3));
      const e = await instance(scalar);
      setup(e, lad, top, periodicZ, false);
      row("WASM scalar", z, await time(() => e.compute32(), 5));
    }
    if (info.simd) {
      const e = await instance(simd);
      setup(e, lad, top, periodicZ, true);
      row("WASM SIMD, 1 lane", z, await time(() => e.compute32simd(), 7));
      row("WASM SIMD, 4 lanes", z, await lanes(simd, lad, top, periodicZ, 4, 7));
    }
  }
  const four = results.find((r) => r.kernel === "WASM SIMD, 4 lanes" && r.z === "open");
  verdict.textContent = four
    ? four.median > 150
      ? `4-lane SIMD ${four.median} ms > 150 ms: by the G1 rule the port stops.`
      : `4-lane SIMD ${four.median} ms ≤ 150 ms: G1 passes.`
    : "No WASM SIMD on this browser: G1 cannot pass.";
  button.disabled = false;
}

button.addEventListener("click", () => void run());
