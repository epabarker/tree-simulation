/**
 * The CPU work the renderers ask of the Scene on every tween frame (M15): positions at time t,
 * colour indices and the leaf layout. Firefox rounds performance.now() to a millisecond, so the
 * page's `?bench` can't resolve this; Node can.
 *
 * Then the work a new snapshot costs the main thread once (I3): setSnapshot and the first
 * computeGeometry, the draw order (sorted here before I3, the core's zOrder column after) and the
 * leaf layout, timed apart, medians of 15 rounds. Each round hands the scene fresh copies of the
 * last two snapshots, so nothing is cached from the round before.
 *
 *   node src/web/render/scene.bench.ts
 */

import { productionWorld } from "../../../tests/production-world.ts";
import { type PresetName, presetParams } from "../../core/presets.ts";
import type { Snapshot } from "../../core/types.ts";
import { LEAF_STYLES } from "./leaf-styles.ts";
import { Scene } from "./scene.ts";

/** A scene tweening between the last two seasons of `seasons` seasons of `preset`. */
function tweening(preset: PresetName, seasons: number): Scene {
  const world = productionWorld(presetParams(preset, 1));
  const lean = { junctions: false, field: false };
  world.run(seasons - 1);
  const scene = new Scene();
  scene.setSize(1280, 800, 1);
  scene.leafStyle = LEAF_STYLES.broadleaf;
  scene.setSnapshot(world.snapshot(0, lean));
  world.step();
  scene.setSnapshot(world.snapshot(0, lean));
  scene.fit(true);
  return scene;
}

/** Median microseconds of `frame()` over `rounds` rounds of `perRound` calls, after a warm-up. */
function time(frame: () => void, rounds = 15, perRound = 40): number {
  for (let i = 0; i < 200; i++) frame();
  const us: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const t0 = performance.now();
    for (let i = 0; i < perRound; i++) frame();
    us.push(((performance.now() - t0) * 1000) / perRound);
  }
  us.sort((a, b) => a - b);
  return us[Math.floor(us.length / 2)] as number;
}

for (const [preset, seasons] of [
  ["forest", 80],
  ["firWood", 80],
] as const) {
  const scene = tweening(preset, seasons);
  let t = 0;
  const us = time(() => {
    t = (t + 0.037) % 1;
    scene.computeGeometry(t);
    scene.colorIndices("natural", 12);
    scene.leaves(5, t);
  });
  const leaves = scene.leaves(5, 0.5).count;
  console.log(
    `${preset.padEnd(13)} ${String(scene.next?.metamerCount).padStart(6)} metamers ${String(leaves).padStart(6)} leaves  ${(us / 1000).toFixed(3)} ms a frame`,
  );
}

/** The last two snapshots after `seasons` seasons of `preset`. */
function lastTwo(preset: PresetName, seasons: number): [Snapshot, Snapshot] {
  const world = productionWorld(presetParams(preset, 1));
  const lean = { junctions: false, field: false };
  world.run(seasons - 1);
  const a = world.snapshot(0, lean);
  world.step();
  const b = world.snapshot(0, lean);
  world.dispose();
  return [a, b];
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((p, q) => p - q);
  return s[Math.floor(s.length / 2)] as number;
};

console.log(
  "\nper snapshot (ms, medians of 15 rounds): setSnapshot + geometry, draw order, leaf layout",
);
for (const [preset, seasons] of [
  ["forest", 40],
  ["forest", 100],
  ["mixedWood", 40],
  ["mixedWood", 100],
] as const) {
  const [a, b] = lastTwo(preset, seasons);
  const parts = { geometry: [] as number[], order: [] as number[], leaves: [] as number[] };
  const total: number[] = [];
  for (let round = 0; round < 18; round++) {
    const scene = new Scene();
    scene.setSize(1280, 800, 1);
    scene.leafStyle = LEAF_STYLES.broadleaf;
    scene.setSnapshot({ ...a });
    scene.computeGeometry(1);
    const s = { ...b };
    const t0 = performance.now();
    scene.setSnapshot(s);
    scene.computeGeometry(0);
    const t1 = performance.now();
    scene.drawOrder(s);
    const t2 = performance.now();
    scene.leaves(5, 0);
    const t3 = performance.now();
    if (round < 3) continue; // warm-up
    parts.geometry.push(t1 - t0);
    parts.order.push(t2 - t1);
    parts.leaves.push(t3 - t2);
    total.push(t3 - t0);
  }
  console.log(
    `${`${preset} ${seasons}`.padEnd(14)} ${String(b.metamerCount).padStart(7)} metamers  ` +
      `${median(parts.geometry).toFixed(2).padStart(6)} ${median(parts.order).toFixed(2).padStart(6)} ` +
      `${median(parts.leaves).toFixed(2).padStart(6)}  total ${median(total).toFixed(2)}`,
  );
}
