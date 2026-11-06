const [species, seed] = process.argv.slice(2);
const { standParams } = await import("/home/edbarker/Documents/Projects/tree-simulation/cli/trials.ts");
process.stdout.write(JSON.stringify(standParams(species as string, Number(seed))));
