/**
 * I1: records what the TypeScript core produces for the cross-core tests, before it is deleted
 * (run at the tag golden-2d-ts): snapshot fingerprints, checkpoint bytes' SHA-256 and the hashes
 * grown on from them. Writes tests/fixtures/ts-core.json.
 *
 *   node docs/experiments/code/2026-10-29-i1/ts-records.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { loadWorld, saveWorld } from "../../../../src/core/checkpoint.ts";
import { hashWorld } from "../../../../src/core/hash.ts";
import { SnapshotBuilder } from "../../../../src/core/snapshot.ts";
import { FULL_SNAPSHOT } from "../../../../src/core/types.ts";
import { World } from "../../../../src/core/world.ts";
import { fingerprint, sha256 } from "../../../../tests/fingerprint.ts";
import {
  CHECKPOINT_RUNS,
  GARDEN_FIXTURE,
  SNAPSHOT_RUNS,
  snapshotSeasons,
} from "../../../../tests/ts-core-cases.ts";

const out = {
  snapshots: {} as Record<string, Record<string, string>>,
  checkpoints: {} as Record<string, { bytes: string; grown: string }>,
  garden: "",
};

for (const [name, params, seasons] of SNAPSHOT_RUNS) {
  const world = new World(params);
  const builder = new SnapshotBuilder();
  const at = new Set(snapshotSeasons(seasons));
  const prints: Record<string, string> = {};
  for (let s = 0; s <= seasons; s++) {
    if (s > 0) {
      world.step();
      world.discardDead();
    }
    if (at.has(s)) prints[s] = fingerprint(builder.build(world, 0, FULL_SNAPSHOT));
  }
  out.snapshots[name] = prints;
}

for (const [name, params, seasons] of CHECKPOINT_RUNS) {
  const world = new World(params);
  world.run(seasons);
  world.setParams({ c3: { ...world.params.c3, alpha: world.params.c3.alpha + 0.1 } });
  world.plantTree(17.25);
  const bytes = saveWorld(world);
  world.run(10);
  out.checkpoints[name] = { bytes: sha256(bytes), grown: hashWorld(world) };
}

const fixture = new URL(`../../../../tests/fixtures/${GARDEN_FIXTURE}`, import.meta.url);
const garden = loadWorld(new Uint8Array(gunzipSync(readFileSync(fixture))));
for (let s = 0; s < 10; s++) {
  garden.step();
  garden.discardDead();
}
out.garden = hashWorld(garden);

const path = new URL("../../../../tests/fixtures/ts-core.json", import.meta.url);
writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
