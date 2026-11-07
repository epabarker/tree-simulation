# G-forest, the model DAG and dead overrides

Promoted from `docs/experiments/code/2026-11-07-night2/` in day-3 step 1.
The historical scripts and baseline JSON remain unchanged. These tools run against
an explicitly selected worktree; summary provenance names the code and inputs read.
Put `~/.cargo/bin` on PATH. Use Node 24 and the analysis project's pinned Python.
Build WASM with `npm run build:wasm` before effective-parameter dumps: the shared
`cli/trials.ts` module loads the existing WASM even though no seasons run here.

## G-forest

```bash
uv run --project analysis python -m treesim.gforest run --worktree . --seeds 1-20 --jobs 3 --out runs/gforest --label head
uv run --project analysis python -m treesim.gforest compare analysis/treesim/baselines/B1-v2.json runs/gforest/evidence.json --crown-version 2
uv run --project analysis python -m treesim.gforest reaggregate runs/gforest/evidence.json
```

Crown v2 is authoritative by default (day-3 ruling 3). `--crown-version 1`
selects the historical v1 comparison explicitly. Both counts remain in JSON and Markdown.
V2 uses five lone comparator seeds per species, then tests the stand outcome over
20 seeds; it is not a claim about a population from five seeds. Comparison requires
matching N ≥20. Seeds/configuration used for tuning are not independent evidence.

Exactly four counts affect VERDICT: floor100, planted hd300, selected crown and
plateau. Each must reach baseline minus two; equality prints **at its limit**.
All-tree H/D and composition are diagnostic. G-budget is printed separately:
median live metamers at 200 ≤1.25× reference. `compare` exits 1 for a forest failure;
its forest exit status does not stand in for the separate budget gate.

`--patch` accepts `{species: {"dotted.path": value}}` and nested dictionaries.
Indexed paths change one level without replacing other levels. It reaches stand
and lone comparators. `RECRUITS` unset uses the selected worktree's planting;
set `RECRUITS=1` to reproduce B0's original configuration. Retained legacy
`NARROW`, `FACEWOOD`, `FACES` dumper options are environment overrides; exact dumped
params are hashed. Register any configuration change before running it.

The run builds the native binary first. Cached lone results in `runs/lonecache/`
(or `EVIDENCE_LONE_CACHE`) are keyed by exact params, seasons and binary SHA-256.
B1 is frozen in `baselines/B1-v2.json` under ADR 0061: width160, recruits0.25,
seeds1–20, 300 seasons, crown v2. Counts are 0/0/14/12; relative bars −2/−2/12/10.
The first two relative constraints are vacuous; zero absolute-band counts remain
reported defects, not validation. The metamer reference at200 is 66,923.
Original B0 remains in `docs/experiments/code/2026-11-07-night2/gates/B0-v2.json`;
use it explicitly for historical comparisons and record its recruits1 mismatch.

## DAG and sweep

```bash
uv run --project analysis python -m treesim.build_dag runs/dag --worktree .
uv run --project analysis python -m treesim.build_dag runs/dag-oak --worktree . --patch oak.json --no-figures
uv run --project analysis python -m treesim.sweep_effects runs/sweep runs/sweep/effects.csv --source-commit PRODUCER_SHA
```

The builder regenerates lone and actual garden effective parameters for all eight
broadleaf species. Options `--width` (160) and `--seed` (1) configure the garden dump.
Stand o2/o4/storm settings come from those params rather than the old assumed forest
preset. Patches use G-forest's species assignments, applied to each effective root.
An opened candidate gate requires a new DAG; a baseline dead-lever table is insufficient.

For an experiment's exact prepared stand, add `--stand-params runs/experiment/base/s1/params.json`.
Its seed and width must match `--seed` / `--width`; the dumper computes stand effective
params from this full world while preserving the ordinary lone worlds. Provenance records
the prepared input hash. A periodic/deeper stand must not silently replace lone inputs.

The step6 adapter `analysis/experiments/day3_layered.py` composes the same maintained
G-forest `summarise`, `aggregate`, `compare` and exact-key lone cache with already-executed
prepared stands. Its comparator worlds are the unchanged current garden's open lone
worlds. The 180-run screen and its base20 adoption sample share those base outcomes;
it does not fork verdict definitions or rerun/select a favourable base sample.

Outputs include `dag.json`, textual graphs, reach tables, figures and provenance:
selected source commit, dirty flag, source hashes, patch and effective-input hashes.
The hand-written table remains an approximation. The lexical coverage guard catches
new direct reads, typed group arguments and simple borrowed aliases; it does not
verify gate semantics or implement a Rust compiler. Review aliases/control flow
when changing a principle. Run `test_day3_instruments.py` after updating the table.

The sweep analyser keeps its positional input/output interface. It records the
analysis commit and hashes jobs, values and result inputs. A producer commit must
be supplied from an independently recorded run; otherwise simulation provenance is
explicitly unknown. Existing three-seed sweep effects choose probes, never adoption.

## E3: on-demand dead-override experiment

```bash
uv run --project analysis python -m treesim.dead_overrides prepare --out runs/e3
uv run --project analysis python -m treesim.dead_overrides execute --out runs/e3 --jobs 3
```

`prepare` runs no simulation. It freezes a manifest with seeds 1–20, every supported
explicit override leaf (including generic broadleaf settings), numeric ±10% of each context’s **effective** value (not the pre-export override), zero
+0.1 and boolean toggles. Enum/string/null leaves are listed as unsupported.
It dumps full input worlds separately from per-species effective params: patching
one species never substitutes that species' effective defaults for the whole stand.
Candidate gate tables are recorded per context. Lone trials run 150 seasons;
actual garden stands run 300 at width 160 and the current quarter recruit cap.

`execute` refuses changed manifests, source commits/hashes or instrument hashes.
Choose a new output directory to prepare after source changes. Default concurrency
is 3, capped at 12; this is expensive and never part of `npm run check`.
Each result needs 20 completed comparisons to report **no observed effect at this
setting**. Missing/failed runs are incomplete, never identical. An unchanged hash
does not prove a lever is dead; thresholds may open at other settings. Preserve
and report newly found candidates; never delete keys automatically. Outputs stay
in ignored `runs/`; commit only permitted summaries.
