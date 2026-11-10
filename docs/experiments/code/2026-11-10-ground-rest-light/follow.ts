// #104's check in a grown tree, any species and seed: each live bud found resting (tip y < 0) at a
// season's end is followed into the next season, where it samples before anything moves it. Counts
// the bud-seasons, those whose Q equals the bottom row's at the place it rested, and those read
// dark (Q = 0) over a lit floor.
//   node follow.ts <repo root> <species> <seed> <box> <seasons> <out.json>
const [root, species, seedS, boxS, seasonsS, out] = process.argv.slice(2);
const { newWorld, openLoneParams } = await import(`${root}/cli/trials.ts`);
const { BudState } = await import(`${root}/src/core/types.ts`);
const { writeFileSync } = await import("node:fs");
const world = newWorld(openLoneParams(species, Number(seedS), Number(boxS)));
let resting = new Map();
let checked = 0, equal = 0, litFloor = 0, darkLit = 0, first = 0;
for (let s = 1; s <= Number(seasonsS); s++) {
  world.step(1);
  const t = world.trees[0];
  if (!t || !t.alive) break;
  const b = t.b.cols;
  const next = new Map();
  for (let j = 0; j < t.b.length; j++) {
    const st = b.state[j];
    if (st !== BudState.active && st !== BudState.dormant && st !== BudState.shortShoot) continue;
    const m = b.metamer[j];
    const at = resting.get(b.birthId[j]);
    if (at) {
      const want = world.sample(at[0], 0, at[1]).q;
      checked++;
      if (b.q[j] === want) equal++;
      if (want > 0) litFloor++;
      if (b.q[j] === 0 && want > 0) darkLit++;
    }
    if (t.tipY(m) < 0) { next.set(b.birthId[j], [t.tipX(m), t.tipZ(m)]); first ||= s; }
  }
  resting = next;
}
writeFileSync(out, JSON.stringify({ species, seed: Number(seedS), checked, equal, litFloor, darkLit, first }));
