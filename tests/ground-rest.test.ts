import { describe, expect, it } from "vitest";
import { newWorld, openLoneParams } from "../cli/trials.ts";
import { BudState } from "../src/core/types.ts";

/**
 * Issue #104, in a grown tree. R3's ground contact (`r3.ground`) rests a limb on y = 0, but its
 * tips land a rounding error below, where the light used to count them outside its box: their buds
 * read Q = 0 over a lit floor. A lone open-grown holly rests limbs from about its seventh season.
 * Each bud found resting at a season's end is followed into the next: it samples before anything
 * moves it, so its Q must be the bottom row's at the place it rested. Before the fix this case
 * had 97 such bud-seasons, every one dark over a lit floor; with it 207, every one equal.
 */
describe("a limb resting on the ground stays in the light (#104)", () => {
  it("holly's resting buds read the bottom row at their x and z", () => {
    const world = newWorld(openLoneParams("holly", 1, 120));
    let resting = new Map<number, [number, number]>(); // bud birthId → the (x, z) it rested at
    let checked = 0;
    let lit = 0;
    for (let s = 1; s <= 20; s++) {
      world.step(1);
      const t = world.trees[0];
      if (!t) throw new Error("no tree");
      const b = t.b.cols;
      const next = new Map<number, [number, number]>();
      for (let j = 0; j < t.b.length; j++) {
        const st = b.state[j];
        if (st !== BudState.active && st !== BudState.dormant && st !== BudState.shortShoot) {
          continue;
        }
        const id = b.birthId[j] as number;
        const m = b.metamer[j] as number;
        const at = resting.get(id);
        if (at) {
          const floor = world.sample(at[0], 0, at[1]).q;
          expect(b.q[j], `bud ${id}, season ${s}`).toBe(floor);
          checked++;
          if (floor > 0) lit++;
        }
        if (t.tipY(m) < 0) next.set(id, [t.tipX(m), t.tipZ(m)]);
      }
      resting = next;
    }
    // The case has teeth only while limbs rest in it, on a floor that has light.
    expect(checked).toBeGreaterThanOrEqual(50);
    expect(lit).toBe(checked);
    world.dispose();
  });
});
