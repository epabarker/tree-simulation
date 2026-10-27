/**
 * The worker's interface, shared by the worker (which implements it) and the page (which calls
 * it through Comlink). Types only, so it type-checks under both the DOM and WebWorker libs.
 */

import type { Params, ParamsPatch } from "../core/params.ts";
import type { Snapshot, SnapshotOptions } from "../core/snapshot.ts";
import type { RunRecord } from "../core/world.ts";

export interface SimApi {
  /** Starts a new run and returns the snapshot of season 0. */
  init(params: Params): Snapshot;
  /** Runs `seasons` seasons and returns the snapshot after the last one. */
  step(seasons: number): Snapshot;
  /** Which optional parts later snapshots carry (default: all, as the lab needs). */
  setSnapshotOptions(options: SnapshotOptions): void;
  /** Queues a parameter change for the next season boundary. */
  setParams(patch: ParamsPatch): void;
  /** Queues the removal of a tree for the next season boundary. */
  removeTree(tree: number): void;
  /** Queues a seedling at world x for the next season boundary. */
  plantTree(x: number): void;
  /** Initial params plus every applied event: replay it with `npm run sim -- --replay`. */
  record(): RunRecord;
}
