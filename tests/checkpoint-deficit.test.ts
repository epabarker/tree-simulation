/** Checkpoint v3/v4's persistent R1/C5 memory; continuation is checked beyond the old state hash. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { presetParams } from "../src/core/presets.ts";
import { BUD_SCHEMA, METAMER_SCHEMA } from "../src/core/types.ts";
import { RustWorld } from "../src/wasm/world.ts";
import { World } from "./world.ts";

type Header = { version: number; trees: { metamers: number; buds: number }[] };
const pad8 = (n: number) => Math.ceil(n / 8) * 8;

function header(bytes: Uint8Array): Header {
  const n = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true);
  return JSON.parse(new TextDecoder().decode(bytes.subarray(4, 4 + n)));
}

function deficits(bytes: Uint8Array): number[][] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = pad8(4 + view.getUint32(0, true));
  // Version 4 (#125) appends C5's relative-test counts after the deficits.
  expect(header(bytes).version).toBe(4);
  return header(bytes).trees.map((tree) => {
    for (const column of Object.values(METAMER_SCHEMA))
      at += pad8(tree.metamers * column.BYTES_PER_ELEMENT);
    for (const column of Object.values(BUD_SCHEMA))
      at += pad8(tree.buds * column.BYTES_PER_ELEMENT);
    const result = Array.from({ length: tree.metamers }, (_, i) =>
      view.getFloat64(at + i * 8, true),
    );
    at += 2 * pad8(tree.metamers * 8);
    return result;
  });
}

function costs(world: RustWorld, deficit: boolean): void {
  const p = world.params;
  world.setParams({
    c3: { ...p.c3, alpha: deficit ? 0 : 1 },
    c5: { ...p.c5, enabled: true, g: 0, Trel: 0 },
    r1: {
      ...p.r1,
      enabled: true,
      shed: "carbon",
      kShed: 3,
      kStarve: 1000,
      mf: deficit ? 100 : 0,
      mw: deficit ? 100 : 0,
    },
    r4: { ...p.r4, enabled: false },
  });
}

function partialStreak(): World {
  const p = presetParams("skyTree", 1);
  const w = new World({ ...p, r1: { ...p.r1, enabled: false }, o4: { ...p.o4, enabled: false } });
  w.run(5); // grow lateral branches before setting production to zero
  costs(w, true);
  w.run(2);
  expect(
    deficits(w.save())
      .flat()
      .some((v) => v === 2),
  ).toBe(true);
  return w;
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

describe("checkpoint deficit memory in WASM", () => {
  it("preserves a partial streak through save and the freeing worker swap, then sheds at the same time", () => {
    const straight = partialStreak();
    const bytes = straight.save();
    const restored = RustWorld.load(bytes);
    const freed = RustWorld.load(bytes);
    expect(sameBytes(freed.intoCheckpoint(), bytes)).toBe(true);
    const before = straight.trees[0].m.length;
    straight.step(1);
    restored.step(1);
    expect(straight.trees[0].m.length).toBeLessThan(before);
    expect(restored.hash()).toBe(straight.hash());
    expect(sameBytes(restored.save(), straight.save())).toBe(true);
    // Compacted state also survives another checkpoint and season.
    const compacted = RustWorld.load(restored.save());
    restored.step(1);
    compacted.step(1);
    expect(sameBytes(compacted.save(), restored.save())).toBe(true);
    restored.dispose();
    compacted.dispose();
  });

  it("resets a restored streak on a surplus season", () => {
    const straight = partialStreak();
    const restored = RustWorld.load(straight.save());
    for (const w of [straight, restored]) {
      costs(w, false);
      w.step(1);
      expect(
        deficits(w.save())
          .flat()
          .every((v) => v === 0),
      ).toBe(true);
      costs(w, true);
      w.step(2);
      expect(
        deficits(w.save())
          .flat()
          .some((v) => v === 2),
      ).toBe(true);
      w.step(1);
    }
    expect(sameBytes(restored.save(), straight.save())).toBe(true);
    restored.dispose();
  });

  it("loads the frozen pre-change v2 fixture with zero missing history", () => {
    const bytes = readFileSync(new URL("./fixtures/checkpoint-v2.bin", import.meta.url));
    expect(header(bytes).version).toBe(2);
    const loaded = RustWorld.load(bytes);
    expect(loaded.season).toBe(3);
    expect(loaded.hash()).toBe("f46fef77");
    expect(
      deficits(loaded.save())
        .flat()
        .every((v) => v === 0),
    ).toBe(true);
    const again = RustWorld.load(loaded.save());
    loaded.step(2);
    again.step(2);
    expect(sameBytes(again.save(), loaded.save())).toBe(true);
    loaded.dispose();
    again.dispose();
  });

  it("rejects a truncated counter column", () => {
    const w = partialStreak();
    const bytes = w.save();
    expect(() => RustWorld.load(bytes.subarray(0, bytes.length - 1))).toThrow(/truncated columns/);
  });
});
