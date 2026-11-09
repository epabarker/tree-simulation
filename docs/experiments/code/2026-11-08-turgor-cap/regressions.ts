// Exploratory copy of cli/regressions.ts (wayfinder #87): phoneSeed3 with a species patch.
//   node regressions.ts patch.json
/**
 * Named regressions (the external review, 2026-11-06; docs/plans/2026-11-06-box-0.17.md, A0.3): known
 * defects kept as outcome vectors, so a change that worsens or fixes one shows instead of passing
 * unnoticed. Each case runs natively (release, `cli/run.ts` builds it when stale), is reduced to a
 * few integers, and is compared exactly with tests/regressions.json. Runs are deterministic (the
 * core's own Math, keyed randomness), so any difference is a change in behaviour: read it, then
 * `--update` and give the reason in docs/devlog.md, as for the goldens. Too slow for `npm run
 * check` (about 80 s natively); CI runs it after the smoke run.
 *
 *   node cli/regressions.ts            compare with tests/regressions.json (exit 1 on a difference)
 *   node cli/regressions.ts --update   rewrite the baselines
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { forestParams } from "../../../../src/core/presets.ts";
import { withAssign } from "../../../../cli/trials.ts";
const PATCH = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : { species: {} };

const RUN = fileURLToPath(new URL("../../../../cli/run.ts", import.meta.url));
const BASELINES = fileURLToPath(new URL("../../../../tests/regressions.json", import.meta.url));

/** A metamers.csv-free reading of metrics.csv: one row per tree per season. */
type Row = { season: number; tree: number; alive: boolean; height: number; metamers: number };

function rows(dir: string): Row[] {
  const [head, ...lines] = readFileSync(join(dir, "metrics.csv"), "utf8").trim().split("\n");
  const col = (name: string) => (head as string).split(",").indexOf(name);
  const [s, t, a, h, m] = ["season", "tree", "alive", "height", "metamers"].map(col);
  return lines.map((line) => {
    const v = line.split(",");
    return {
      season: Number(v[s as number]),
      tree: Number(v[t as number]),
      alive: v[a as number] === "1",
      height: Number(v[h as number]),
      metamers: Number(v[m as number]),
    };
  });
}

function run(args: string[], params?: object): Row[] {
  const dir = mkdtempSync(join(tmpdir(), "treesim-regression-"));
  try {
    if (params) writeFileSync(join(dir, "params.json"), JSON.stringify(params));
    const extra = params ? ["--params", join(dir, "params.json")] : [];
    execFileSync("node", [RUN, ...args, ...extra, "--quiet", "--out", join(dir, "run")], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    return rows(join(dir, "run"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const at = (r: Row[], season: number) => r.filter((x) => x.season === season && x.alive);
const sum = (r: Row[]) => r.reduce((a, x) => a + x.metamers, 0);

/** Each case: what it is, its issue, and its outcome vector (integers only, so equality is exact). */
const CASES: Record<string, { issue: number; note: string; vector: () => Record<string, number> }> =
  {
    phoneSeed3: {
      issue: 54,
      note: "the phone's ring (forestParams(66, 3)) is nearly empty by 150; canopy = live trees >= 40 cells",
      vector() {
        let p = forestParams(66, 3);
        for (const [sp, a] of Object.entries(PATCH.species)) p = withAssign(p, sp, a as Record<string, unknown>);
        const planted = p.trees.length;
        const r = run(["--preset", "mixedWood", "--seasons", "150"], p);
        const out: Record<string, number> = {};
        for (const s of [50, 100, 150]) {
          const live = at(r, s);
          out[`live${s}`] = live.length;
          out[`planted${s}`] = live.filter((x) => x.tree < planted).length;
          out[`canopy${s}`] = live.filter((x) => x.height >= 40).length;
          out[`metamers${s}`] = sum(live);
        }
        return out;
      },
    },
    forestRegeneration: {
      issue: 55,
      note: "`forest` (tau 0) cannot regenerate under its own floor: recruits reaching 20 cells by 300",
      vector() {
        const r = run(["--preset", "forest", "--seed", "1", "--seasons", "300"]);
        const planted = new Set(r.filter((x) => x.season === 1).map((x) => x.tree)).size;
        const tallest = new Map<number, number>();
        for (const x of r)
          if (x.tree >= planted) tallest.set(x.tree, Math.max(tallest.get(x.tree) ?? 0, x.height));
        const live300 = at(r, 300);
        return {
          recruitsBorn: tallest.size,
          recruitsReaching20: [...tallest.values()].filter((h) => h >= 20).length,
          live300: live300.length,
          plantedAlive300: live300.filter((x) => x.tree < planted).length,
          metamers300: sum(live300),
        };
      },
    },
  };

const update = false; // exploratory copy (wayfinder #87): compare only, with a species patch
delete (CASES as Record<string, unknown>).forestRegeneration; // `forest` has no species: a species patch cannot move it
const stored = (() => {
  try {
    return JSON.parse(readFileSync(BASELINES, "utf8")) as Record<
      string,
      { vector: Record<string, number> }
    >;
  } catch {
    return {};
  }
})();
const now: Record<string, object> = {};
let differs = false;
for (const [name, c] of Object.entries(CASES)) {
  const t0 = performance.now();
  const vector = c.vector();
  now[name] = { issue: c.issue, note: c.note, vector };
  const before = stored[name]?.vector;
  const changed = Object.keys({ ...before, ...vector }).filter((k) => before?.[k] !== vector[k]);
  const secs = ((performance.now() - t0) / 1000).toFixed(0);
  if (!changed.length) {
    console.log(`${name} (#${c.issue}): unchanged (${secs} s)`);
    continue;
  }
  differs = true;
  console.log(`${name} (#${c.issue}): ${before ? "CHANGED" : "no baseline"} (${secs} s)`);
  for (const k of changed) console.log(`  ${k}: ${before?.[k] ?? "-"} -> ${vector[k] ?? "-"}`);
}
if (update) {
  writeFileSync(BASELINES, `${JSON.stringify(now, null, 2)}\n`);
  console.log(`wrote ${BASELINES}: give the reason in docs/devlog.md`);
} else if (differs) {
  console.log(
    "A named regression moved: read it, then `node cli/regressions.ts --update` with a devlog reason.",
  );
  process.exitCode = 1;
}
