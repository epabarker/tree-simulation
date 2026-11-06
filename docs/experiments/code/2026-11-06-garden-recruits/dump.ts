const [wt, width, seed] = process.argv.slice(2);
const { forestParams } = await import(`${wt}/src/core/presets.ts`);
const recruits = Number(process.env.RECRUITS ?? "1");
process.stdout.write(JSON.stringify(forestParams(Number(width), Number(seed), { recruits })));
