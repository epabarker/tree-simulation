// node dump_effective.ts <repo> <outdir> [width=160] [seed=1]
// No seasons run: resolve the same species overlay used by RustWorld.paramsOf.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [repoArg, outArg, widthArg = "160", seedArg = "1", standArg, speciesArg] = process.argv.slice(2);
if (!repoArg || !outArg) throw new Error("expected repo and output directory");
const repo = resolve(repoArg);
const out = resolve(outArg);
const { loneParams } = await import(pathToFileURL(resolve(repo, "cli/trials.ts")).href);
const { forestParams } = await import(pathToFileURL(resolve(repo, "src/core/presets.ts")).href);
const { speciesParams } = await import(pathToFileURL(resolve(repo, "src/core/params.ts")).href);
const species = speciesArg ? speciesArg.split(",").map(s => s.trim()) : ["beech", "hornbeam", "birch", "oak", "holly", "maple", "rowan", "willow"];
if (new Set(species).size !== species.length || species.some(s => !/^[a-z][a-z0-9_-]*$/.test(s)))
  throw new Error("expected unique comma-separated species identifiers");
const garden = standArg ? JSON.parse(readFileSync(resolve(standArg), "utf8")) : forestParams(Number(widthArg), Number(seedArg));
if (garden.seed !== Number(seedArg) || garden.world.width !== Number(widthArg))
  throw new Error("prepared stand seed/width differs from selected configuration");
mkdirSync(out, { recursive: true });
const loneWorlds: Record<string, unknown> = {};
for (const context of ["lone", "stand"]) {
  const result: Record<string, unknown> = {};
  for (const sp of species) {
    const params = context === "lone" ? loneParams(sp, Number(seedArg)) : garden;
    result[sp] = speciesParams(params, sp);
    if (context === "lone") loneWorlds[sp] = params;
  }
  writeFileSync(resolve(out, `species_effective_${context}.json`), `${JSON.stringify(result, null, 1)}\n`);
}
writeFileSync(resolve(out, "garden_params.json"), `${JSON.stringify(garden, null, 1)}\n`);

writeFileSync(resolve(out, "species_worlds_lone.json"), `${JSON.stringify(loneWorlds, null, 1)}\n`);
