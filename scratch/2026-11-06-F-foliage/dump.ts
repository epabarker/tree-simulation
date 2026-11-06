const [wt, width, seed] = process.argv.slice(2);
const { forestParams } = await import(`${wt}/src/core/presets.ts`);
const recruits = Number(process.env.RECRUITS ?? "1");
const p = forestParams(Number(width), Number(seed), { recruits });
// A4 candidate: NARROW=<depth> narrows the slab to the recruit band, FACEWOOD=<share> adds the virtual wood.
if (process.env.NARROW) {
  const d = Number(process.env.NARROW);
  p.world.depth = d;
  for (const t of p.trees) t.z = d / 2;
  p.o4.band = d;
}
if (process.env.FACEWOOD) p.world.faceWood = Number(process.env.FACEWOOD);
// Agent F: FACES=<tau> sets both depth faces' transmission (the garden's 0.2 otherwise).
if (process.env.FACES) p.world.faces = [Number(process.env.FACES), Number(process.env.FACES)];
process.stdout.write(JSON.stringify(p));
