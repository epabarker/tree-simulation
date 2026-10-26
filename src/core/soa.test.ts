import { describe, expect, it } from "vitest";
import { Table } from "./soa.ts";

describe("Table", () => {
  it("grows, zeroes new rows and compacts in order", () => {
    const t = new Table({ id: Int32Array, x: Float64Array }, 2);
    for (let i = 0; i < 10; i++) {
      const r = t.add();
      expect(t.cols.x[r]).toBe(0);
      t.cols.id[r] = i;
      t.cols.x[r] = i * 1.5;
    }
    expect(t.length).toBe(10);
    expect(t.capacity).toBeGreaterThanOrEqual(10);

    const keep = new Uint8Array(10).map((_, i) => (i % 3 === 0 ? 0 : 1));
    const map = t.compact(keep);
    expect(Array.from(t.cols.id.subarray(0, t.length))).toEqual([1, 2, 4, 5, 7, 8]);
    expect(Array.from(map)).toEqual([-1, 0, 1, -1, 2, 3, -1, 4, 5, -1]);

    // A reused row must not keep stale values from before compaction.
    const r = t.add();
    expect(t.cols.id[r]).toBe(0);
    expect(t.cols.x[r]).toBe(0);
  });
});
