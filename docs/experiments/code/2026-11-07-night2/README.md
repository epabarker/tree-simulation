# Code for the night of 6–7 Nov 2026

Copied out of a session scratchpad, which is gone. Shell scripts and some Python files still name that scratchpad (`/tmp/claude-1000/...`) or agent worktrees. Treat them as a record and edit the paths before reuse. The gate tools in `gates/` are the exception: they run from here.

## Maintained successors (day-3 step 1)

The originals below are historical records. Maintained G-forest, DAG, sweep and on-demand E3 tools
are now in [analysis/treesim](../../../../analysis/treesim/INSTRUMENTS.md). G-forest's successor fixes
the four-check VERDICT and leaves all-tree H/D diagnostic. Both crown versions remain available;
crown v1 remains the default until day-3 step 2. Existing baseline JSON is unchanged.

## gates/: G-forest and crown v2

- **`evidence2.py`:** G-forest (floor100, hd300, crown, plateau) with crown v1 and v2 side by side.
  - It runs `--worktree WT`'s native treesim on the garden's world (`forestParams` through `dump.ts`), 20 seeds and 300 seasons.
  - Lone comparators are cached in `runs/lonecache/` (override with `EVIDENCE_LONE_CACHE`).
- **`evidence.py`:** the v1-only original.
- **Baselines:**
  - `B0-v1.json` (B0 = d2c4f53, 2/3/11/11);
  - `B0-v2.json` (B0 under v2; crown 15).
  - **Their config:** width 160, 20 seeds, 300 seasons, faces 0.2 (the garden's), and recruits at 1, B0's default before #50 (229 live trees).
  - **The night's HEAD runs** set `RECRUITS=0.25` (57 live trees, the garden since #50).
  - `dump.ts` now uses the worktree's own planting when `RECRUITS` is unset. To reproduce B0, set `RECRUITS=1`.
  - A baseline and a run should share a config; B1 should be run at the garden's own.
- **Results:** `v2-*.json` / `.md` (HEAD, beech twigs, birch every node, and oak-form's afternoon candidate, not N3's).

```bash
export PATH=$HOME/.cargo/bin:$PATH
python3 docs/experiments/code/2026-11-07-night2/gates/evidence2.py run --worktree . --seeds 1-20 --jobs 3 --out runs/ev-head --label head
python3 docs/experiments/code/2026-11-07-night2/gates/evidence2.py compare docs/experiments/code/2026-11-07-night2/gates/B0-v2.json runs/ev-head/evidence.json
```

- **The `--patch` JSON** is `{species: {"dotted.path": value}}`, applied before the run, so it reaches the stand and the lone comparators. Prefer it to treesim's `--species-patch`, which merges one level only.
- **The VERDICT line** wrongly counts `hd300_all`, which is a warning only. Read the four checks yourself: each ≥ B0 − 2.

## The rest

- **`crownbase/`:**
  - `filldump.ts`, which builds layered or periodic worlds (env LAYERED, CANOPYSET, SIDESZ, FACES, M0ZERO, ALLSP, O4OFF, NOSTORM, SPPATCH);
  - `limbs.py`, the like-for-like crown base cbG (the lowest first-order limb reaching ≥ 2.5 m, over H);
  - `gate.py` and `gateA6.py`, A4's and A6's crown-base gates.
- **`n1/`:** beech-in-shade diagnostics (`trace.py`, `causes.py`, `surv.py`); `loff-candidate.patch` (beech's `r6.lifespan` off); G-forest outputs `gf-head.json` and `gf-loff.json`.
- **`n3/`:** the oak declaration, the candidate's patch (`T55p25.patch.json`), and its fresh-seed and G-forest summaries. The full work is on branch `claude/n3-oak`.
- **`sweep/`:** the ±10% lone sweep (`jobs.tsv`, `job.sh`, `measure.py`).
- **`dag/`:** `build_dag.py`, plus `reach.md`, `reach_tables.md` and `sweep_effects.csv`. Figures are in `../../figures/2026-11-07-*`.
