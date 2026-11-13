/**
 * A garden checkpoint saved before #121 (the 0062/0063 garden flip, ADR 0065) still loads and grows
 * on as the build that wrote it would have (#122's gate, AGENTS.md "Checkpoints keep their bytes").
 * The fixture is 46f3cf4's own `forestParams(66, 1)` at season 6, written by its native build
 * (tests/fixtures/garden-pre121.md). Its params predate `o4.suppressionSignal` and the two-part
 * mortality; read with today's defaults they keep the old behaviour, so ten more seasons reach the
 * state hash 46f3cf4 reached growing the same garden to 16 from scratch.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { coreWasm, loadWorldsSync, RustWorld } from "../src/wasm/world.ts";

beforeAll(() => loadWorldsSync(readFileSync(coreWasm)));

const fixture = () =>
  new Uint8Array(
    gunzipSync(readFileSync(new URL("./fixtures/garden-pre121-66-1-s6.bin.gz", import.meta.url))),
  );

describe("a garden checkpoint saved before #121", () => {
  it("loads with its own params, today's new ones at their defaults", () => {
    const w = RustWorld.load(fixture());
    expect(w.season).toBe(6);
    expect(w.hash()).toBe("37377bcf");
    expect(w.params.o4.mortality).toBe("sizeBlind");
    expect(w.trees.filter((t) => t.alive).length).toBeGreaterThan(0);
    w.dispose();
  });

  it("grows on to the hash its own build reached from scratch at season 16", () => {
    const w = RustWorld.load(fixture());
    w.step(10, true);
    expect(w.season).toBe(16);
    expect(w.hash()).toBe("083d0cb6");
    w.dispose();
  });

  it("saved again, loads back to the same bytes", () => {
    const w = RustWorld.load(fixture());
    const again = w.save();
    w.dispose();
    const back = RustWorld.load(again);
    expect(Buffer.from(back.save()).equals(Buffer.from(again))).toBe(true);
    back.dispose();
  });
});
