/**
 * The expected hashes in rust/core/tests/sweep_fixture.rs, from the TypeScript sweep:
 *
 *   node rust/tools/sweep_fixture.ts
 *
 * A 64 × 40 world with a deterministic scatter of deposits and one wall, swept for 5 seasons
 * with rotating directions, by rows and by columns, open and on a ring; FNV-1a over the bytes of
 * Q, V_x and V_y after every season.
 */
import { SkySweep } from "../../src/core/light/sky-sweep.ts";
import { defaultParams, type Params } from "../../src/core/params.ts";

const fnv = (h: number, a: Float64Array) => {
  const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  for (let i = 0; i < b.length; i++) h = Math.imul(h ^ (b[i] as number), 0x01000193) >>> 0;
  return h;
};
for (const columns of [false, true]) {
  for (const periodic of [false, true]) {
    const c2: Params["c2"] = {
      ...defaultParams.c2,
      K: 9,
      rotate: true,
      kExt: 0.6,
      skyTilt: 0.3,
      skyExponent: 1.5,
      sweep: columns ? "columns" : "rows",
    };
    const s = new SkySweep(64, 40, c2, periodic);
    let h = 0x811c9dc5;
    let seed = 12345;
    for (let season = 0; season < 5; season++) {
      s.clear();
      s.addWall({ x: 5, y: 0, width: 3, height: 25, shade: 2 });
      for (let i = 0; i < 300; i++) {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        const x = (seed / 2 ** 32) * 70 - 3;
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        const y = (seed / 2 ** 32) * 36;
        s.deposit(x, y, 1 + (i % 3) * 0.25);
      }
      s.compute(season);
      h = fnv(fnv(fnv(h, s.q), s.vx), s.vy);
    }
    console.log(`columns ${columns} periodic ${periodic}: 0x${h.toString(16).padStart(8, "0")}`);
  }
}
