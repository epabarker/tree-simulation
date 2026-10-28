import { describe, expect, it } from "vitest";
import { treeMetrics } from "./metrics.ts";
import { mergeParams, type ParamsPatch } from "./params.ts";
import { presetParams } from "./presets.ts";
import type { Tree } from "./tree.ts";
import { World } from "./world.ts";

// M11 visible test (§7, ADR 0013): a log–log self-thinning line, judged with size inequality
// (§10; Reynolds & Ford 2005); gaps refill from seed; and periodic sides remove the open-edge
// effect of M6e. Crown gaps and bimodality are in the M11 note.
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] as number;
const wood = (t: Tree) => treeMetrics(t).woodVolume;

function thinning(seed: number, spacing = 3.5) {
  const n = Math.round(210 / spacing);
  const trees = Array.from({ length: n }, (_, k) => ({ x: ((k + 0.5) * 210) / n }));
  const world = new World(mergeParams(presetParams("thinning", seed), { trees }));
  const planted = world.trees.length;
  const path: { n: number; mass: number; cv: number }[] = [];
  for (let s = 0; s < 110; s++) {
    world.step();
    const masses = world.trees.filter((t) => t.alive).map(wood);
    const mean = masses.reduce((a, b) => a + b, 0) / masses.length;
    const sd = Math.sqrt(masses.reduce((a, x) => a + (x - mean) ** 2, 0) / masses.length);
    path.push({ n: masses.length, mass: mean, cv: sd / mean });
  }
  // Least-squares slope of log mean mass on log density over the thinning phase.
  const dying = path.filter((p) => p.n < planted);
  const x = dying.map((p) => Math.log(p.n));
  const y = dying.map((p) => Math.log(p.mass));
  const mx = x.reduce((a, b) => a + b, 0) / x.length;
  const my = y.reduce((a, b) => a + b, 0) / y.length;
  let sxy = 0;
  let sxx = 0;
  x.forEach((xi, i) => {
    sxy += (xi - mx) * ((y[i] as number) - my);
    sxx += (xi - mx) ** 2;
  });
  return {
    planted,
    survivors: (path.at(-1) as { n: number }).n,
    slope: sxy / sxx,
    // Inequality while the stand thins (the first seasons' seedlings are alike).
    peakCv: Math.max(...dying.map((p) => p.cv)),
  };
}

describe("M11: stand dynamics without edges (§O4, §O2, ADR 0013)", () => {
  it("thins a dense stand along a log–log line; size inequality rises with density", () => {
    const dense = [1, 2, 3].map((s) => thinning(s));
    const sparse = [1, 2, 3].map((s) => thinning(s, 10.5));
    // Measured: 60 → 17–19 survivors, slope −2.8 to −3.1; peak CV 0.61–0.66 against ≈ 0.3.
    // Bimodality is marginal (Sarle's coefficient peaks at 0.53–0.58), so it is not asserted.
    for (const r of dense) expect(r.survivors).toBeLessThan(0.4 * r.planted);
    const slope = median(dense.map((r) => r.slope));
    expect(slope).toBeLessThan(-2);
    expect(slope).toBeGreaterThan(-4);
    expect(median(dense.map((r) => r.peakCv))).toBeGreaterThan(
      1.5 * median(sparse.map((r) => r.peakCv)),
    );
  }, 90_000);

  it("refills a felled canopy tree's gap from seed", () => {
    const FELL = 60;
    const recruitsNear = (seed: number, fell: boolean) => {
      const world = new World(presetParams("forest", seed));
      for (let s = 0; s < FELL + 30; s++) {
        if (fell && s === FELL) world.removeTree(4);
        world.step();
      }
      const x4 = (world.trees[4] as Tree).rootX;
      return world.trees.filter((t) => t.id >= 10 && t.alive && Math.abs(t.rootX - x4) <= 12)
        .length;
    };
    const felled = [1, 2, 3, 4, 5].map((s) => recruitsNear(s, true));
    const kept = [1, 2, 3, 4, 5].map((s) => recruitsNear(s, false));
    // Measured: 17 recruits near the felled tree against 4 near the same tree when kept.
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    expect(sum(felled)).toBeGreaterThan(sum(kept));
  }, 90_000);

  it("removes the open-edge effect: edge trees no longer lean out (periodic sides)", () => {
    // Outward lean of the two end trees: the left one leaning left and the right one right count
    // as positive. Signed, so the random lean every tree has (larger since M18) averages out.
    const outward = (patch: ParamsPatch) => {
      const leans = [1, 2, 3, 4, 5].flatMap((seed) => {
        const world = new World(mergeParams(presetParams("forest", seed), patch));
        world.run(50);
        const off = (k: number) => treeMetrics(world.trees[k] as Tree).centroidOffset;
        return [-off(0), off(9)];
      });
      return leans.reduce((a, b) => a + b, 0) / leans.length;
    };
    const NO_O4 = { o4: { enabled: false } };
    const ring = outward(NO_O4);
    const open = outward({
      ...NO_O4,
      world: { width: 210, height: 130, walls: [], sides: "open" },
    });
    // Measured (M18): −0.4 cells on the ring against 2.7 in the open.
    expect(open).toBeGreaterThan(1.5);
    expect(ring).toBeLessThan(0.5 * open);
  });
});
