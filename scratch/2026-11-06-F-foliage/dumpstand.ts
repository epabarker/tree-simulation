const [species, seed] = process.argv.slice(2);
const { standParams } = await import("/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-a28199a6f8557d21d/cli/trials.ts");
process.stdout.write(JSON.stringify(standParams(species as string, Number(seed))));
