/**
 * A snapshot built by hand for the renderers' depth tests (I3): two one-metamer trees rising from
 * the same point, one far (z 50) and one near (z 5). The far one is 2 cells tall and the near one
 * 4, so their strokes and leaves can be told apart by where they end. Both are young, so each
 * carries a leaf. Without `zOrder` (the default) the scene sorts by z itself.
 */
import type { Snapshot } from "../../core/types.ts";

export const FAR = 0;
export const NEAR = 1;

export function nearAndFar(zOrder: number[] = []): Snapshot {
  const f32 = (xs: number[]) => Float32Array.from(xs);
  return {
    season: 1,
    width: 20,
    height: 20,
    depth: 64,
    periodic: false,
    storm: false,
    metamerCount: 2,
    parent: Int32Array.from([-1, -1]),
    x0: f32([10, 10]),
    y0: f32([0, 0]),
    angle: f32([Math.PI / 2, Math.PI / 2]),
    length: f32([2, 4]),
    radius: f32([0.2, 0.2]),
    z0: f32([50, 5]),
    dirX: f32([0, 0]),
    dirY: f32([1, 1]),
    dirZ: f32([0, 0]),
    tree: Int32Array.from([0, 1]),
    birthId: Int32Array.from([0, 0]),
    order: Uint8Array.from([0, 0]),
    light: f32([1, 1]),
    resource: f32([0, 0]),
    age: f32([0, 0]),
    stress: f32([0, 0]),
    prevIndex: Int32Array.from([-1, -1]),
    zOrder: Int32Array.from(zOrder),
    budCount: 0,
    budMetamer: new Int32Array(0),
    budState: new Uint8Array(0),
    budQ: new Float32Array(0),
    shadow: null,
    walls: [],
    obstacles: [],
    species: {},
    junctions: new Float32Array(0),
    metrics: [],
    seasonMs: 0,
    snapshotMs: 0,
  };
}
