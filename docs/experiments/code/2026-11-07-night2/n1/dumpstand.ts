// dumpstand.ts SPECIES SEED [KIND] : the closed stand's params (or KIND=shade:<roof>), env SPPATCH '{"beech":{"dotted.path":v}}'
const [species, seed, kind] = process.argv.slice(2);
const T = await import("/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170/cli/trials.ts");
const p: any = kind?.startsWith("shade:") ? T.shadeParams(species as string, Number(seed), Number(kind.slice(6))) : T.standParams(species as string, Number(seed));
if (process.env.SPPATCH) {
  for (const [sp, kv] of Object.entries(JSON.parse(process.env.SPPATCH))) for (const [path, v] of Object.entries(kv as any)) {
    const keys = path.split("."); let cur: any = p.species[sp];
    for (const k of keys.slice(0, -1)) cur = cur[Array.isArray(cur) ? Number(k) : k] ??= {};
    cur[keys.at(-1) as string] = v;
  }
}
process.stdout.write(JSON.stringify(p));
