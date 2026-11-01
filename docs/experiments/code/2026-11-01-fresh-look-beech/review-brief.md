# Review brief: the fresh-look beech round (for an independent reviewer)

**Reviewed 2026-11-01:** [the review](../../2026-11-01-fresh-look-beech-review.md) (what was reproduced, where this brief is wrong, 20-seed evidence, the garden, ADRs 0039–0043).

You are reviewing one round of work on a tree-growth simulator. You did not do it. Judge the work and
the claims made about it; do not take the summaries below as true without checking them against the
repository. Where this brief and the code disagree, the code wins: say so.

## Where everything is

- Repository: `epabarker/tree-simulation`, branch **`claude/fresh-look-beech`**, based on
  `claude/ship-week` (itself on the `3d-port` line). Head at the time of writing: `424d895`.
- Everything about the round: `docs/experiments/code/2026-11-01-fresh-look-beech/`.
  - `task.md`: the brief every agent read. Goal, constraints, the ecology guard.
  - `notes.md`: the ledger. Three proposals, solver decision, review, the user's judgement, repair, both blind tests.
  - `review-checklist.md`, `blind-test.md`: how the result was judged.
  - `species-identity-*.md`, `references-beech.md`: the botanical target (sourced card; a photo geometry note).
  - `baseline/`, `proposals/`, `solve-round1/`, `repair-round1/`: sheets and metrics at each stage.
  - `blind-round1/`, `blind-round2/`: the namers' answers and the keys.
  - `render.py` (the harness), `blind.py`, `sandbox.sh`, `prompts/`.
- Project conventions: `AGENTS.md` (invariants: RNG only through `rng.rs` purposes; no platform Math;
  parent-before-child; principles behind params; goldens change only on purpose; ask before diverging
  from `docs/spec.md` or an ADR). Background: `docs/spec.md`, `docs/STATUS.md`, ADRs in `docs/decisions/`.

## What the round was

The user's goal: a walker who knows British trees should name the beech in the garden on a phone, at
40–100 seasons, without a label. The lone open-grown dome is the main judge; the closed stand must
still hold (ecology guard: alive ≥ 10 of 12 at 100, floor about 3–5%, LAI about 7, H/D 70–110).

Method (after GVS5H / Memdoor's team-solve): three ideators (Opus agents) worked in copies of the repo
with the project's history removed, each from a different starting point (A: existing rules; B:
structural; C: botany first), and wrote proposals with prototype sheets into one ledger. A solver
combined them; a checklist reviewer and a blind namer judged the result; the user added a judgement;
one repair worker acted on it; a second blind namer judged the repair.

## What changed in the code (all switchable, default off; only beech's patch turns them on)

Solver, commit `2ba590b`:
1. **Relay gate** (`r2.relayCrowd`): the sympodial relay's leader termination is scaled by
   `max(0, 1 − relayCrowd × s̄)`, s̄ the tree's mean R5 neighbour shade. Lone trees fork; stand trees keep a leader.
2. **Vigour fork and arm hold** (`r2.forkAt`, `r2.forkAngle`; `vigour_forks`, `arm_set_point` in `r2.rs`):
   a level-0 shoot whose bud vigour exceeds `forkAt` × the full shoot length ends its apex; the relay's
   arms hold the angle they left at instead of being straightened like the trunk.
3. **Vigour drop** (`r2.vigourShare`, `vigourLambda`, `vigourTreeLo/Hi`; `vigour`, `vigour_gate` in
   `r2.rs`, used in `c3.rs`): apical control falls in weak wood of a vigorous tree, gated by the
   tree's own resource in absolute units (3000–10000).

Repair, commit `77b28e6`:
4. **Light orthotropy** (`r2.lightSetPoint`, `lightLo`, `lightHi`, `lightOver`; `light_set_point` in
   `r2.rs`, applied in `season.rs` growth and `r3.rs` posture): lit wood on a vigorous tree is held more
   upright over a shoot's first seasons; shaded wood stays level.
5. **Own-crown pruning** (`c5.Tvig` in `c5.rs`): a vigorous tree also sheds a side branch whose light
   falls below g·Tvig·Q_top.

Beech's values: `analysis/fit/hand-overrides.toml` [beech] → `src/core/flora-fitted.ts` (via
`analysis/experiments/m27_adopt.py`) → `rust/presets.json` (`node cli/export-presets.ts`). The
orchestrator checked that every changed entry in `rust/presets.json` is inside a beech patch.

## What is claimed, and how it was measured

| | today | solver (`2ba590b`) | repair (`77b28e6`) |
|---|---|---|---|
| lone 100: height, W/H (world 160 / 240) | 182–204, 0.47–0.63 (160) | 96–99, 1.75–2.13 (240) | 133–143, 1.14–1.27 (240) |
| stand 100: alive, H/D, floor, LAI | 11–12, 107–109, 4.3–4.8%, 6.9–7.1 | 11–12, 85–101, 4.4–4.8%, 7.1–8.5 | bit-identical to the solver's |
| checklist (of 10; pass 8): stand / lone 60 / lone 100 | 6 / 4 / 3 | 7 / 7 / 7 | not scored |
| blind namer, first guess on 12 beech panels | Norway spruce (lone), birch (stand) | cedar of Lebanon (lone), birch | oak (lone), birch |

Beech was named first on **0 of 12** panels in both blind tests. In the second test, the **hornbeam
decoy was named beech on 8 of 9 lone panels**. The user observed that the lower branches always
survive and the lower trunk never becomes bare; the repair's own-crown pruning was its response.

Measured with `render.py`: native `treesim` runs of the lone trial (oakOpen, one tree) and the closed
stand (84 wide, periodic, opaque faces, 12 trees), seeds 1–3, drawn frontal with leaves as dots. Its
"today" numbers matched the project's round-5 panel (stand H/D 108, crown ratio 0.36, floor 4.5%, LAI 6.9).

## What the orchestrator would check first (known weaknesses)

1. **Freshness was partial.** The ideators' sandboxes had no history, but the solver and repair worked
   in the real repo: `CLAUDE.md` loads `docs/STATUS.md` and `AGENTS.md` into every session, and the
   repair worker says STATUS arrived in its context.
2. **The harness changed mid-round.** The lone world was 160 cells wide for the baseline, proposals
   and solver; 240 for the repair and the second blind test (160 trimmed the solver's crown: W/H 1.65 →
   1.83). The first blind test's decoys were at 160; the second's at 240.
3. **Evidence is three seeds.** Thresholds sit on cliffs by the agents' own account (`c5.Tvig` 0.25
   against umbrellas at 0.30–0.35; `forkAt` 1.3). The project's own rule for a claim about all seeds is
   N ≥ 20 with a stated pass rate (AGENTS.md); none was run. Seeds 1001–1006 were never run.
4. **Absolute-unit gates.** `vigourTreeLo/Hi` are in resource units, so trees at the garden's edges
   get a partial response. Nobody has looked at the garden plate or the lab renderer, or at a mixed wood.
5. **Goldens do not exercise the change.** The beech golden cases stop at season 15, before any rule
   acts; "no golden moved" says only that default-off is untouched.
6. **The physiology boundary.** The brief held shedding (C5, R1) fixed for the ecology (ADR 0032).
   `c5.Tvig` changes shedding; it is gated by tree vigour and the stand's hashes are equal, but it is
   a C5 change. No ADRs were written for any of the five rules (AGENTS.md: a new principle needs an ADR
   and the user's acceptance).
7. **Sources.** The own-crown pruning's basis (Sprugel et al. 1991; Takenaka 1994) was cited from
   memory by the repair worker and is not in the identity card.
8. **The blind test is weak evidence.** One model namer per round, form only (all species drawn in
   the same colours), low or medium confidence, and the orchestrator picked the decoys.
9. **Not run:** the full `npm run check` in one go (its parts were run: `rust:check`, `build:wasm`,
   `tests/golden.test.ts`, lint, typecheck), `npm run bench`, the Python tests, `npm run evidence:2d`,
   any phone or browser check. The container ran Rust `stable` (1.97.0, the pinned version), because
   the pinned channel could not be downloaded.

## What to review

1. **Code:** the diff `git diff claude/ship-week..claude/fresh-look-beech -- rust src analysis/fit`.
   Against AGENTS.md's invariants: is every rule truly off by default (bit-identical), does any new
   randomness go through a registered `rng.rs` purpose, does any new maths go through `rust/core/src/math`,
   are the hooks in the right phase of the §6 season loop, do the unit tests test the rule's local
   behaviour? Is anything written for beech alone in disguise?
2. **Biology:** does each rule have the basis claimed for it in the card (`species-identity-beech.md`
   and its sources), or is it a fit wearing a citation?
3. **Claims:** reproduce the repair's sheet and metrics (below), and one blind result from its key.
4. **The judgement:** given 0 of 12 named, is any of this worth keeping as a step towards the goal, and
   what should round 2 be? The orchestrator's lean: start from why the hornbeam reads as beech.

## Reproducing

    git checkout claude/fresh-look-beech
    export PATH=<Node 24 bin>:$PATH        # Node 24 is required (the goldens fail under 22)
    cd rust && cargo build --release -p treesim && cd ..
    analysis/.venv/bin/python docs/experiments/code/2026-11-01-fresh-look-beech/render.py \
        --species beech --seeds 1,2,3 --lone-width 240 --out runs/fresh-look/review-repair --label "repair"
    # compare runs/fresh-look/review-repair/metrics.json with repair-round1/metrics.json

(`uv run --project analysis python …` works in place of `analysis/.venv/bin/python`.) For a blind set:
`blind.py --source label=runs/fresh-look/<run> … --out <dir outside the repo> --key <file>`.
