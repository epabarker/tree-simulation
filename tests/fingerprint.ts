/**
 * A snapshot's fingerprint: SHA-256 over every scalar, array, metric and wall it holds, each
 * number as its float64 bits (so −0 and NaN count). tests/fixtures/ts-core.json holds the
 * TypeScript core's (I1), made at the tag golden-2d-ts by
 * docs/experiments/code/2026-10-29-i1/ts-records.ts; the Rust world's must match.
 */
import { createHash } from "node:crypto";
import type { Snapshot } from "../src/core/types.ts";

export const SNAPSHOT_ARRAYS = [
  "parent",
  "x0",
  "y0",
  "angle",
  "length",
  "radius",
  "tree",
  "birthId",
  "order",
  "light",
  "resource",
  "age",
  "stress",
  "prevIndex",
  "budMetamer",
  "budState",
  "budQ",
  "junctions",
] as const;

export function fingerprint(s: Snapshot): string {
  const h = createHash("sha256");
  const num = (v: number) => h.update(new Uint8Array(Float64Array.of(v).buffer));
  for (const k of ["season", "width", "height", "periodic", "storm", "metamerCount", "budCount"]) {
    h.update(k);
    num(Number(s[k as keyof Snapshot]));
  }
  for (const k of SNAPSHOT_ARRAYS) {
    const a = s[k] as ArrayLike<number>;
    h.update(`${k}:${a.length}`);
    h.update(new Uint8Array(Float64Array.from(a).buffer));
  }
  const shadow = s.shadow ?? [];
  h.update(`shadow:${shadow.length}`);
  h.update(new Uint8Array(Float64Array.from(shadow).buffer));
  for (const m of s.metrics) {
    // By key name: the cores build the metrics objects in different orders.
    for (const [k, v] of Object.entries(m as object).sort(([a], [b]) => (a < b ? -1 : 1))) {
      h.update(k);
      if (typeof v === "number") num(v);
      else h.update(JSON.stringify(v) ?? "undefined");
    }
  }
  h.update(JSON.stringify([s.walls, s.obstacles, s.species]));
  return h.digest("hex");
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
