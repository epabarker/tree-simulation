const [wt, width, seed] = process.argv.slice(2);
const { forestParams } = await import(`${wt}/src/core/presets.ts`);
process.stdout.write(JSON.stringify(forestParams(Number(width), Number(seed))));
