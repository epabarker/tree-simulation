/**
 * Pre-C1 item 4: what I2's four-lane timing left out. In worker lanes (separate instances, no
 * shared memory), each lane's partial field (q, vx, vy, vz below the top leafy row) must come back
 * to the world's instance and be summed in lane order (ADR 0025's fixed lanes). This times that
 * return trip on the main side: four lanes' fields copied out of their memory (a transfer's
 * slice), then summed into the world's. Sizes: `forest`'s at seasons 40 and 100 (top ≈ 85 and
 * 125 rows of 210 × 64), and the garden at 66 and 160 cells (top ≈ 115).
 *   node docs/experiments/code/2026-10-31-pre-c1/lane-return.ts
 */
const CASES = [
  { name: "forest s40", w: 210, d: 64, top: 85 },
  { name: "forest s100", w: 210, d: 64, top: 125 },
  { name: "garden 160", w: 160, d: 64, top: 115 },
  { name: "garden 66", w: 66, d: 64, top: 115 },
];
const LANES = 4;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1] as number;
for (const c of CASES) {
  const n = c.top * c.w * c.d * 4; // q, vx, vy, vz
  const lanes = Array.from({ length: LANES }, () => new Float32Array(n).map(() => Math.random()));
  const world = new Float32Array(n);
  const copy: number[] = [];
  const sum: number[] = [];
  for (let r = 0; r < 9; r++) {
    let t0 = performance.now();
    const back = lanes.map((l) => l.slice()); // the bytes a lane posts as a transferable
    copy.push(performance.now() - t0);
    t0 = performance.now();
    world.set(back[0] as Float32Array);
    for (let k = 1; k < LANES; k++) {
      const b = back[k] as Float32Array;
      for (let i = 0; i < n; i++) world[i] = (world[i] as number) + (b[i] as number);
    }
    sum.push(performance.now() - t0);
  }
  console.log(
    JSON.stringify({ case: c.name, mbPerLane: Math.round((n * 4) / 1e5) / 10, copyMs: median(copy).toFixed(1), sumMs: median(sum).toFixed(1) }),
  );
}
