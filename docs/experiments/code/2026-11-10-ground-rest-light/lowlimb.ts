// #104, before against after: a lone open-grown tree (openLoneParams), one seed. At each recorded
// season: the probe's low-limb numbers (boleLimb, boleLeaf), size, the season's shed count summed
// so far, and the live buds resting on the ground (tip y < 0). Whether they are lit is follow.ts's
// question: at a season's end a new bud has not sampled yet, so its Q says nothing.
//   node lowlimb.ts <repo root> <species> <seed> <box> <seasons,comma> <out.json>
const [root, species, seedS, boxS, seasonsS, out] = process.argv.slice(2);
const { newWorld, openLoneParams } = await import(`${root}/cli/trials.ts`);
const { BudState } = await import(`${root}/src/core/types.ts`);
const { writeFileSync } = await import("node:fs");
const at = seasonsS.split(",").map(Number);
const world = newWorld(openLoneParams(species, Number(seedS), Number(boxS)));
const rows = [];
let shed = 0;
const t0 = Date.now();
while (world.season < Math.max(...at)) {
  world.step(1);
  const t = world.trees[0];
  if (!t || !t.alive) break;
  const m = world.metricsOf(t);
  shed += m.shed;
  if (!at.includes(world.season)) continue;
  const b = t.b;
  let live = 0, resting = 0, low = 0, lowQ = 0;
  const leafy = [];
  for (let j = 0; j < b.length; j++) {
    const st = b.cols.state[j];
    if (st !== BudState.active && st !== BudState.dormant && st !== BudState.shortShoot) continue;
    live++;
    const y = t.tipY(b.cols.metamer[j]);
    if (st !== BudState.dormant) leafy.push(y);
    if (y < 0) resting++;
    if (y < 4) { low++; lowQ += b.cols.q[j]; } // the lowest metre
  }
  leafy.sort((a, c) => a - c);
  rows.push({
    season: world.season, heightM: m.height * 0.25, widthM: m.crownWidth * 0.25,
    boleM: m.boleHeight * 0.25, boleLimb: m.boleHeight / m.height,
    boleLeaf: leafy.length ? leafy[Math.floor(0.05 * leafy.length)] / m.height : NaN,
    crownRatio: m.crownRatio, metamers: m.metamers, live, resting,
    lowBuds: low, lowQ: low ? lowQ / low : NaN, shed, outside: m.budsOutside,
  });
}
writeFileSync(out, JSON.stringify({ species, seed: Number(seedS), box: Number(boxS), rows, hash: world.hash(), secs: (Date.now() - t0) / 1000 }));
