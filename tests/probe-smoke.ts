/**
 * The feature probe's smoke test (spec #111, Testing Decisions: "the probe itself gets a smoke test
 * only"): it runs `cli/probe.ts` on a very short run and checks that it writes its sheet, labelled
 * exploratory, with the absent-species warning. Its numbers are the core's and are tested there.
 *
 * Kept out of `npm test` as the named regressions are: it needs the native release build of
 * treesim (`cli/run.ts` builds it when stale), which `npm test` does not. CI runs it after the
 * regressions.
 *
 *   npm run probe:smoke
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FLORA } from "../src/core/flora.ts";
import { forestParams } from "../src/core/presets.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PROBE = join(ROOT, "cli", "probe.ts");
const label = `smoke-${process.pid}`;
const dir = join(ROOT, "runs", "probe", label);

// A species the 54-cell garden of seed 1 does not plant: its patch must be flagged, not read as
// "no change". Chosen from the planting itself, so the test follows the garden when it changes.
const planted = new Set(forestParams(54, 1).trees.map((t) => t.species));
const absent = Object.keys(FLORA).find((s) => !planted.has(s));
assert.ok(absent, "every species is planted in the 54-cell garden: pick a narrower one");

const scratch = join(ROOT, "runs", "probe", `${label}-input`);
mkdirSync(scratch, { recursive: true });
const patch = join(scratch, "patch.json");
writeFileSync(
  patch,
  JSON.stringify({
    params: { c3: { lambda: 0.52 } },
    species: { [absent]: { c5: { Trel: 0.25 } } },
  }),
);

try {
  const t0 = performance.now();
  const out = execFileSync(
    "node",
    [
      PROBE,
      ...["--patch", patch, "--label", label, "--species", absent],
      ...["--seeds", "1", "--lone", "2,3", "--garden", "2,3", "--widths", "54", "--jobs", "4"],
    ],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const sheet = join(dir, "sheet.html");
  assert.ok(existsSync(sheet), `no sheet at ${sheet}`);
  const html = readFileSync(sheet, "utf8");
  assert.match(html, /exploratory/i, "the sheet is labelled exploratory");
  assert.match(html, /contact sheet/i);
  assert.ok(html.includes(`${absent} is absent`), "the absent patched species is flagged");
  const meta = JSON.parse(readFileSync(join(dir, "probe.json"), "utf8"));
  assert.equal(meta.status, "exploratory");
  assert.deepEqual(meta.seeds, [1]);
  // Both arms of both stages ran, each a treesim run with its metrics.
  for (const arm of ["head", "patch"]) {
    assert.ok(existsSync(join(dir, arm, "lone-seed1", "metrics.csv")), `${arm} lone run`);
    assert.ok(existsSync(join(dir, arm, "garden54-seed1", "stand.csv")), `${arm} garden run`);
  }
  assert.match(out, /exploratory/i, "the summary line says exploratory");
  console.log(`probe smoke: ok (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
}
