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
  /**
   * Starts from a world checkpoint (core/checkpoint.ts, M21) instead, gzipped or already unzipped
   * by the server, and returns the snapshot of the season it was saved at.
   */
  restore(gzipped: ArrayBuffer): Promise<Snapshot>;
  /**
   * Puts the running world aside and starts `params` in its place, returning its season 0; with
   * null, drops that world and resumes the one put aside where it stood (M19: a page's specimen
   * plate grows its own tree while the forest waits).
   */
  swap(params: Params | null): Snapshot;
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
