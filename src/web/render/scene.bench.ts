/**
 * The CPU work the renderers ask of the Scene on every tween frame (M15): positions at time t,
 * colour indices and the leaf layout. Firefox rounds performance.now() to a millisecond, so the
 * page's `?bench` can't resolve this; Node can.
 *
 *   node src/web/render/scene.bench.ts
 */

import { productionWorld } from "../../../tests/production-world.ts";
import { type PresetName, presetParams } from "../../core/presets.ts";
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
