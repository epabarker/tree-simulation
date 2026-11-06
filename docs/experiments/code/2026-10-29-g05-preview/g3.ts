/**
 * G3 page: times the Rust slab sweep (production build: Float32, integer shifts, polynomial exp,
 * WASM SIMD) on the prototype's 3D stands at D = 64 with K = 16 rotating (and K = 12, the
 * fallback): scalar and SIMD in one lane, and SIMD in four lanes, each lane a worker with its own
 * instance marching every fourth direction (G1's lane model). Replaces G1's kernel numbers.
 */
import { load, type Stand, STANDS, sweep } from "./g3-shared.ts";

const env = document.getElementById("env") as HTMLElement;
const tbody = document.querySelector("#out tbody") as HTMLElement;
const json = document.getElementById("json") as HTMLElement;
const button = document.getElementById("run") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLElement;
const info = { userAgent: navigator.userAgent, cores: navigator.hardwareConcurrency, crossOriginIsolated: self.crossOriginIsolated };
env.textContent = `cores ${info.cores}; crossOriginIsolated ${info.crossOriginIsolated}`;
const results: Record<string, unknown>[] = [];
const REPS = 15;

const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number;
function row(kernel: string, stand: string, K: number, t: number[], top: number): void {
  const r = { kernel, stand, K, median: +med(t).toFixed(1), min: +Math.min(...t).toFixed(1), runs: t.length, top };
  results.push(r);
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${kernel}</td><td>${stand}</td><td>${K}</td><td>${r.median}</td><td>${r.min}</td>`;
  tbody.append(tr);
  json.textContent = JSON.stringify({ ...info, results }, null, 1);
}
const pause = () => new Promise((r) => setTimeout(r, 20));

async function single(buds: Float64Array, st: Stand, K: number, simd: boolean): Promise<void> {
  const s = sweep(buds, st.tau, K, simd);
  s.compute(0); // warm-up
  const t: number[] = [];
  for (let i = 1; i <= REPS; i++) {
    await pause();
    const t0 = performance.now();
    s.compute(i); // a new season: the sky rotates
    t.push(performance.now() - t0);
  }
  row(simd ? "WASM SIMD, 1 lane" : "WASM scalar, 1 lane", st.label, K, t, s.top());
  s.free();
}

async function lanes(buds: Float64Array, st: Stand, K: number, n: number): Promise<void> {
  const workers = Array.from({ length: n }, () => new Worker(new URL("./g3-worker.ts", import.meta.url), { type: "module" }));
  const reply = (w: Worker, type: string) =>
    new Promise<void>((res) => {
      const h = (ev: MessageEvent) => {
        if (ev.data.type === type) {
          w.removeEventListener("message", h);
          res();
        }
      };
      w.addEventListener("message", h);
    });
  await Promise.all(
    workers.map((w) => {
      const p = reply(w, "ready");
      w.postMessage({ type: "init", buds: buds.slice().buffer, tau: st.tau, K });
      return p;
    }),
  );
  const t: number[] = [];
  for (let i = 0; i <= REPS; i++) {
    await pause();
    const t0 = performance.now();
    await Promise.all(
      workers.map((w, lane) => {
        const p = reply(w, "done");
        w.postMessage({ type: "run", season: i, lane, lanes: n });
        return p;
      }),
    );
    if (i > 0) t.push(performance.now() - t0);
  }
  for (const w of workers) w.terminate();
  row(`WASM SIMD, ${n} lanes`, st.label, K, t, 0);
}

button.onclick = async () => {
  button.disabled = true;
  await load();
  for (const st of STANDS) {
    status.textContent = `loading ${st.label}…`;
    const buds = new Float64Array(await (await fetch(`./g3/${st.file}`)).arrayBuffer());
    for (const K of st.tau === 0.2 && st.file.includes("s100") ? [16, 12] : [16]) {
      status.textContent = `${st.label}, K ${K}…`;
      if (K === 16) await single(buds, st, K, false);
      await single(buds, st, K, true);
      await lanes(buds, st, K, 4);
    }
  }
  status.textContent = "done: copy the JSON below";
  button.disabled = false;
};
