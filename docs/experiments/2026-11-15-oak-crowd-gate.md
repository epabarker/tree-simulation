# Does a neighbour gate on the oak's fall of λ let `d16a13` pass the garden guard? (2026-11-15)

**Tickets:** [#124](https://github.com/epabarker/tree-simulation/issues/124); [ADR 0069](../decisions/0069-deep-research-report-disposition.md) decision 5, whose bars were fixed and amended before any run. Branch `probe/124-oak-crowd-gate`, cut from `3d-port` 7d51c5d (the pinned baseline). **Nothing is adopted:** `r2.dLambdaCrowd` is a probe param, absent = off and bit-identical; no flora, preset, golden or regression changes.

**Question.** `d16a13` (the oak's `r2.dLambda` 0.16 from `aC` 13.5) rounds the open-grown oak and was approved on its form, but fails the garden guard: the planted oak stays short and dies young ([the evidence note](2026-11-10-oak-rounded-crown-evidence.md)). Is that because the fall is triggered by age whether or not the tree is crowded? The rule under test scales the fall by g = max(0, 1 − k·s̄), s̄ the tree's mean R5 neighbour shade (ADR 0039's signal): λ = level.lambda − share·Δλ·t·g. One arm, k 10.

## Answer

**The gate explains the oak's failure and fails the guard anyway, on one criterion.**

- **The oak's own failure is cured, past HEAD.** On seeds 1–20 the gated `d16a13` has a live oak at season 150 in 19 gardens at 160 cells (HEAD 17, plain `d16a13` 8) and 14 at 66 cells (HEAD 8, plain 1), and a seeding oak at 150 in 8 and 10 (HEAD 4 and 3, plain 0 and 0). Both regeneration bars pass at both widths.
- **The named regressions pass.** `forestRegeneration` is hash-identical; `phoneSeed3`'s canopy at 150 goes from 2 to 3.
- **The lone oak is untouched:** `d16a13` with and without the gate is hash-identical on 20 of 20 seeds at season 100, so the open-grown evidence and the user's approval of the form carry over.
- **Bare bole fails at 66 cells, in 5 of 5 judged cells.** Beech's and hornbeam's live crown base falls by more than the ±0.05 bar (hornbeam at 150: 0.399 → 0.152). All 6 cells pass at 160 cells. Every judged cell must pass, so criterion 2 fails and **the guard fails**.
- **Why, as far as these runs show (an inference, not traced):** the gate does not restore HEAD's oak, it removes the stand oak's fall altogether (below), so the garden has more and taller oaks and 10–11× the oak recruits. On the phone's narrow plot that changes which beech and hornbeam stand ≥ 10 m (hornbeam at 150: 57 → 32 trees) and how clothed they are.
- **By ADR 0069:** no second k is tried and no bar is moved. The result is recorded, and decision 1's question (a new axis class) returns to the user; a failed gate does not by itself justify one.

## Step 0: can the gate act in time? (read-only, before any core change)

`rust/core/examples/crowd_probe.rs` replays the guard's gardens (seeds 1–3, widths 160 and 66, HEAD and `d16a13`, to season 150) and logs each planted oak each season. The oak's params carry an inert `r2.relayCrowd` so the core computes s̄ for it; the gardens' hashes are identical with and without it (`step0.ts --check`).

- **Futility test (fixed in the ADR): passed, 11 of 11 planted oaks.** Each read s̄ ≥ 0.05 in every season from `aC` to its divergence season (6–12 of 6–12 seasons).
- **The feared timing did not happen.** At the fall's first season s̄ is already 0.08–0.37, and the `d16a13` oak falls 10% behind HEAD's at seasons 19–25, with t at 0.4–0.75.
- **k 10 is saturated in the garden.** s̄ ≥ 0.1 in 61% of tree-seasons at ages 10–14 and in 92–100% from 14 on (medians 0.20–0.26), so g = 0: for the oak the coefficient is a switch between alone and in a stand, not a graded response. It was taken from beech and hornbeam and was not tuned.

| planted oaks, seeds 1–3, to 150 | HEAD | `d16a13` |
|---|---|---|
| median peak height, m | 22.1 | 13.5 |
| leader's order at divergence | 0–3 | 0–10 |

## The pilot (seeds 1–3, both widths, 300 seasons, 11 planted oaks)

| | HEAD | `d16a13` | `d16a13` + k 10 |
|---|---|---|---|
| median peak height, m | 24.4 | 13.5 | 33.4 |
| reach `r1.maturity` (32.5 m) | 2 | 0 | 8 |
| alive at 150 / at 299 | 6 / 1 | 1 / 0 | 6 / 4 |
| median last live season | 172 | 54 | 185 |
| gardens (of 6) where a planted oak ever seeds | 1 | 0 | 5 |

- **f = (33.4 − 13.5) / (24.4 − 13.5) = 1.82**, against the 0.5 that proposes the full run. All 11 oaks peak higher than under `d16a13`, and all 11 at or above HEAD's.
- **The arm overshoots HEAD.** Under the gate the fall is fully off in 60–100% of tree-seasons by age band (median fall applied 0.000 against 0.037–0.160 ungated), so the stand oak also loses HEAD's own ungated 0.04. HEAD's fall already costs the garden oak height.
- The user accepted the recommendation to run the 20-seed guard on this evidence.

## The guard (seeds 1–20, 160 and 66 cells, 300 seasons; bars unchanged)

`node cli/oak-garden-guard.ts --crowd 10 -j 6`, 33 min on 6 simulators. HEAD was re-run on this build and reproduces the 2026-11-12 counts exactly (17/4 and 8/3), as does the script's #122 self-check.

| criterion | bar | 160 cells | 66 cells | verdict |
|---|---|---|---|---|
| 1. live oak at 150 (gardens of 20) | ≥ HEAD − 2 | 19 against 17 | 14 against 8 | pass |
| 1. seeding oak at 150 (gardens of 20) | ≥ HEAD − 2 | 8 against 4 | 10 against 3 | pass |
| 2. bare bole (every judged cell) | lcb ± 0.05, lid ± 25% | 6 of 6 pass | **0 of 5 judged pass** | **FAIL** |
| 3. named regressions no worse | hash equal, or counts not lower | `phoneSeed3` canopy150 2 → 3 | `forestRegeneration` identical | pass |

Reported beside it (HEAD → gated): live oak at 300, 7 → 12 and 4 → 8; gardens whose oaks set seed by 150, 7 → 20 and 5 → 18; oak recruits, 1,350 → 16,946 and 700 → 7,523; recruits reaching 1.3 m, 4 → 161 and 13 → 107.

Bare bole at 66 cells (pooled medians; trees ≥ 10 m):

| cell | HEAD n, lcb, lid | gated n, lcb, lid | |
|---|---|---|---|
| beech at 100 | 4, 0.020, 0.20 | 5, 0.025, 0.13 | not judged (n < 5) |
| beech at 150 | 6, 0.100, 0.45 | 8, 0.042, 0.21 | fail |
| beech at 300 | 10, 0.279, 0.53 | 16, 0.192, 0.66 | fail |
| hornbeam at 100 | 18, 0.135, 0.85 | 18, 0.064, 0.73 | fail |
| hornbeam at 150 | 57, 0.399, 0.65 | 32, 0.152, 0.64 | fail |
| hornbeam at 300 | 76, 0.461, 0.47 | 50, 0.309, 0.42 | fail |

## The basin report (ADR 0069 decision 4)

Not run. The ADR asked for k 5 and 20 on the pilot's seeds; with s̄ ≥ 0.1 in 92–100% of tree-seasons from age 14, k 10 and k 20 give the same g = 0 there, and k 5 is fully off only from s̄ ≥ 0.2, about the median. So the arm sits on a plateau above k 10 and on a slope below it. This is read from step 0's shade values, not from runs.

## What this settles, and what it leaves

- **Settled:** `d16a13`'s garden failure is the age-triggered fall acting on a crowded tree. A signal the tree already holds separates the lone oak from the stand oak completely, with no new state and no change to the lone tree.
- **Not settled:** whether the oak can take this without disturbing the phone garden's beech and hornbeam. The failing criterion is about other species in a different stand, not about the oak.
- **Three seeds and one k** for the pilot; the guard's 20 seeds are one build and one garden (the 0062/0063 garden at r6), which #133 and #134 may change.
- **The cause of the bare-bole change is not traced.** More oak in a 66-cell plot is the obvious candidate; an oak that never loses apical control in the stand is also not the oak HEAD has.
- **For the user:** (a) hold #124 as it is; (b) ask whether the guard's bare-bole bar, written to catch the patched oak harming the stand, should bind when the oak does better than HEAD's (a bar change needs a new decision, not this note); (c) a different design, such as gating only the excess over HEAD's 0.04, which is a new experiment with its own bars.

## Reproduce

```
node docs/experiments/code/2026-11-15-oak-crowd-gate/step0.ts            # params, then crowd_probe per line of jobs.txt
node docs/experiments/code/2026-11-15-oak-crowd-gate/step0.ts --check    # the inert-params check
python3 -I docs/experiments/code/2026-11-15-oak-crowd-gate/step0_summary.py runs/oak-crowd-gate/step0
node docs/experiments/code/2026-11-15-oak-crowd-gate/step0.ts --pilot
python3 -I docs/experiments/code/2026-11-15-oak-crowd-gate/pilot_summary.py runs/oak-crowd-gate/pilot
node cli/oak-crown.ts --patch <d16a13.json | d16a13k10.json> --seeds 1-20 --no-head --species oak   # Bar A's hashes
node cli/oak-garden-guard.ts --crowd 10 -j 6
```

The probe: `cargo run --release --example crowd_probe -- <params.json> <seasons> <planted> oak 10 > <name>.csv`. Outputs are under `runs/oak-crowd-gate/` and `runs/oak-garden-guard-k10/` (generated, not committed).

## Limits

- `npm run check:stamp` was green on the committed rule, run while #133's sweep was running from another checkout.
- Bar A's second half (birch, beech and hornbeam hash-identical to HEAD) rests on the param being absent for them and on the unchanged goldens; no separate lone runs were made.
- The lone oak's identity depends on R5's neighbour signal reading exactly 0 for a tree alone (`r5.signal: "neighbours"`); under `"light"` a lone tree's own shade would gate its fall.
