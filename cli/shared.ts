/**
 * Helpers the evidence scripts share (garden-acceptance, oak-garden-guard, oak-crown, open-grown,
 * probe): command-line options, a bounded pool, a params patch, and the native runner on a record.
 * No side effects on import.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeParams,
  type Params,
  type ParamsPatch,
  patchSpecies,
  type SpeciesPatch,
} from "../src/core/params.ts";

/** The headless runner (`cli/run.ts`, which builds treesim when stale). */
export const RUN = fileURLToPath(new URL("run.ts", import.meta.url));

/** The value after `name` on the command line (`--seeds 1-20`), or `fallback`. */
export const arg = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
};

/** Runs `f` over `items`, at most `n` at once. */
export async function pool<T>(items: T[], n: number, f: (x: T) => Promise<unknown>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await f(items[next++] as T);
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

/** A world's params patch: a params patch, then species patches. */
export type Patch = { params?: ParamsPatch; species?: Record<string, SpeciesPatch> };

/** `base` with `patch` applied: its params merged, then each species patched in turn. */
export const patched = (base: Params, patch: Patch): Params => {
  let p = patch.params ? mergeParams(base, patch.params) : base;
  for (const [name, sp] of Object.entries(patch.species ?? {})) p = patchSpecies(p, name, sp);
  return p;
};

/**
 * Runs the native runner with `args`, quietly, into `dir`; writes its wall time in seconds to
 * `dir/wall.txt` and resolves with it.
 */
export function runCli(args: string[], dir: string): Promise<number> {
  mkdirSync(dir, { recursive: true });
  const t0 = performance.now();
  return new Promise((ok, bad) => {
    const c = spawn(process.execPath, [RUN, ...args, "--quiet", "--out", dir], {
      stdio: ["ignore", "ignore", "inherit"],
    });
    c.on("exit", (code) => {
      const s = (performance.now() - t0) / 1000;
      writeFileSync(join(dir, "wall.txt"), `${s}\n`);
      code === 0 ? ok(s) : bad(new Error(`${dir}: exit ${code}`));
    });
  });
}

/** Runs `params` for `seasons` into `dir`, as a replay of a record with no events. */
export function sim(params: Params, seasons: number, dir: string): Promise<number> {
  mkdirSync(dir, { recursive: true });
  const record = join(dir, "record.json");
  writeFileSync(record, JSON.stringify({ params, events: [], seasons }));
  return runCli(["--replay", record, "--seasons", String(seasons)], dir);
}

/** The median of `xs`; NaN when empty. Filter non-finite values first if they must not count. */
export const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};
