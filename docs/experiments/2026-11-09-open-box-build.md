# Build (a): the open-grown lone-tree box, built and checked on 20 seeds

_2026-11-09. Issue [#98](https://github.com/epabarker/tree-simulation/issues/98), [ADR 0062](../decisions/0062-light-entry.md), the playbook's [handoff](../features/README.md#handoff). It follows the exploratory [open-box note](2026-11-08-open-box.md) (seeds 1–3). Code: `code/2026-11-09-open-box-build/`._

## What was built
- **`oakOpen` and `beechOpen` are open-grown.** They use `openGrown(species)`: τ = 1 on both z faces, open x sides, a square box of `OPEN_BOX` = 240 cells (60 m), 200 cells (50 m) tall, with the tree at its centre. These are the lab's lone trees.
- **The rest stays half-walled.** The trials (`trialBase`, so `loneParams` and fit-eval), the garden's specimen (`specimenParams`) and the milestone scripts and 2D-calibrated evidence (the fixture `oakOpenWalled`) keep `WALLED_LONE`: 160 × 64 cells between τ 0.2 faces. The pin reproduces the pre-0062 golden hashes (`the_prototype_rules_written_as_off_keep_the_goldens`).
- **The hard check is a metric:** `budsOutside` counts live buds whose tip lies past a side or the top of the light's box (Q = 0 there). A periodic side is never passed. Buds below y = 0 are not counted (see the ground defect below).
- **The built preset is the probe's world.** With any of the six species swapped in at (120, 120), `beechOpen` gives the open-box note's params exactly: holly seed 1's hash at season 100 is that note's, 7d5224f3.

## Method
- `run.sh`: `treesim --preset beechOpen` with the tree swapped, for oak, maple, birch, beech, hornbeam and holly, seeds 1–20, 100 seasons, natively, 12 at a time. `summary.py` reads metrics.csv every season and form.csv at season 100.
- **Reach:** beech, birch and oak again in an 80 m square box 65 m tall (`BOX=320 TOP=260`), seeds 1–20. The larger world changes the light, so these are new realisations, not the 60 m runs unclipped.
- `cost.ts`: the lab's cost in WASM (Node): a season, then a snapshot as the worker takes one, per season. Seed 1, 100 seasons, a fresh process per run, on an idle laptop (i7-1260P).

## The hard check: buds outside the 60 m box

| | zero every season | zero at season 100 | seeds with buds outside |
|---|---|---|---|
| oak | 19 of 20 | 20 of 20 | s15: 12 buds at season 81 only |
| maple | 20 of 20 | 20 of 20 | — |
| birch | 16 of 20 | 18 of 20 | s3: leader to 53.8 m, past the 50 m top, 17 seasons from 78, up to 141 buds. s13: 38 seasons from 55, up to 165. s5: 10 seasons from 90, 1–2. s18: season 100, 1 |
| beech | 18 of 20 | 18 of 20 | s11: 11 seasons from 89, up to 18 (10 at 100). s15: season 100, 4 |
| hornbeam | 20 of 20 | 20 of 20 | — |
| holly | 20 of 20 | 20 of 20 | — |
| **all** | **113 of 120** | **116 of 120** | |

**The acceptance check fails at 20 seeds:** "0 buds outside the box at season 100" holds in 116 of 120. The open-box note's 17 of 18 came from seeds 1–3, where only birch seed 3 left the box.

- **Beech and oak press on the sides.** At season 100, eight beech and birch crowns reach 29.6–30.1 m from the root, against the box's 30 m half-side. A bud past it gets Q = 0 and dies, so these reaches are censored.
- **In the 80 m × 65 m box, beech and oak never leave it.** The farthest reach at season 100 is 32.8 m (oak s15) and 31.6 m (beech s13). Their median reaches are 25.8 m and 27.5 m.
- **Birch leaves even the 80 m box, through runaways.** Two leaders reach 65–66 m (s3 to 65.0 m, s16 to 66.3 m, 4 seasons past the 65 m top). Two seeds send transient limbs about 40 m sideways: s13 to z = 320.3 at season 63 (40.1 m from the root, 3 m up), and s2 to z = −3.2 at season 69 (40.8 m, 19.6 m up). Those limbs are shed: by season 100 both crowns reach only 26–31 m. Birch's runaway leaders are a known item (the playbook's "after (c)"); its runaway limbs are new.
- **Decision (the user, 2026-11-09):** the box stays 60 m, as the issue specified. The resize, and whether birch's runaways are a defect or a box to hold, is a follow-up.

## The half-walled findings, re-checked in the open box (20 seeds)
ADR 0062 asked for these to be re-measured. Seed ranges at season 100, with the median in brackets. The metrics differ from the open-box note's, which were leaf-based: here W/H and D/H span every wood tip, and "top width" is form.csv's profile (wood tips, the larger of x and z) in its top two bands of ten.

| | H (m) | H100 − H60 (m) | W/H | D/H | lowest live limb / H | top width |
|---|---|---|---|---|---|---|
| oak | 32.9–34.6 (33.3) | −0.4–2.2 (0.2) | 0.94–1.71 (1.26) | 0.85–1.41 (1.25) | 0.007–0.016 (0.008) | 0.16–0.45 (0.24) |
| maple | 23.6–27.7 (26.1) | 3.1–6.8 (4.4) | 1.01–1.37 (1.15) | 0.97–1.34 (1.10) | 0.009–0.037 (0.018) | 0.56–0.98 (0.77) |
| birch | 30.4–37.7 (32.6) | −9.9–10.2 (5.3) | 1.20–1.64 (1.44) | 1.23–1.76 (1.53) | 0.007–0.008 (0.008) | 0.44–0.79 (0.56) |
| beech | 32.4–37.5 (34.7) | 8.5–13.4 (10.5) | 1.31–1.59 (1.42) | 1.30–1.62 (1.49) | 0.007–0.014 (0.007) | 0.58–0.92 (0.73) |
| hornbeam | 28.9–29.6 (29.1) | −0.2–2.8 (0.0) | 0.94–1.32 (1.12) | 0.89–1.38 (1.12) | 0.008–0.009 (0.009) | 0.27–0.82 (0.60) |
| holly | 15.0–15.9 (15.3) | −0.0–0.3 (0.0) | 0.78–1.67 (1.09) | 0.70–1.98 (1.04) | 0.016–0.043 (0.017) | 0.18–0.48 (0.29) |

| Finding (half-walled) | 20 seeds, open box |
|---|---|
| Self-pruning: the lowest limb is the first lateral near the ground; the clear bole is 0.006–0.04 of H (#78) | **Survives in 120 of 120.** The lowest live limb is at 0.007–0.043 H. An open-grown tree keeps its low limbs; the bare bole is a stand feature (GLOSSARY) |
| The oak spire: its leader stalls at 33–34 m from ≈ 60 (#79) | **Survives in 20 of 20.** H is 32.9–34.6 m at 100, and it gains −0.4–2.2 m after season 60. Its top width (0.16–0.45, median 0.24) is the narrowest of the six. Hornbeam (29 m) and holly (15 m) also stop by 60 |
| Maple, the flat cap (#79) | **Weakened, as the open-box note found.** Maple's top width, 0.56–0.98 (0.77), is the widest median, but it overlaps beech's 0.58–0.92 (0.73). A wood-tip measure; the leaf measure needs the probe |
| Birch, a column (#79) | **An artefact of the walls, confirmed.** W/H is 1.20–1.64 and D/H 1.23–1.76 in all 20 seeds |
| Shedding by R1's carbon test, C5 dormant except in birch (#78) | Not re-measured here: metrics.csv has no shed cause. It holds for seeds 1–3 of this exact preset (the open-box note, identical params) |

## Cost in the lab (WASM)

| seed 1, seasons 91–100 | s/season (season + snapshot) | 100 seasons | WASM memory |
|---|---|---|---|
| `beechOpen`, open box | 0.79–1.44 + 0.08–0.12 | 47–90 s | 749 MB |
| `oakOpen`, open box | 1.00–1.22 + 0.05 | 80–86 s | 546 MB |
| `beechOpen`, half-walled (240 × 64) | 0.38 + 0.04 | 26 s | 220 MB |
| `oakOpen`, half-walled (160 × 64) | 0.19 + 0.01 | 16 s | 110 MB |

- **The ranges are three runs each,** on one laptop, minutes apart. The spread (1.8× for beech) is the laptop's heat, not the model. The open-box note measured 0.86 s/season for beech.
- **The box costs 3–5× the walled time, and 3.4–5× the memory.** The issue accepts this cost, and there is no cheaper lab mode. Native, with 12 runs at once, a run took 1–10 min and peaked at 0.3–0.84 GB (beech 728–839 MB).
- **The goldens stay quick.** `beechOpen:seed1:s40` takes 13.8 s in vitest (WASM) idle, under the 30 s timeout. Under a 12-simulator load it timed out, as did a dozen tests the box does not touch.

## Found on the way
- **A bud on a limb resting on the ground gets no light.** R3 lays the limb level at y ≈ −1e−17, a rounding error below 0, and the light's `cell` puts that outside the slab, so Q = 0. It shows from season 7 in a small holly. `budsOutside` leaves the ground out, as the open-box note's probe did. It is a defect of its own, wherever `r3.ground` is on (every preset and species entry that sets it sets it true), so it gets a follow-up issue.
- **The probe's merge trap.** A preset's `world` merges one level deep, so a script that patched `oakOpen`'s width kept the open box's 240-cell depth and τ 1 faces. The spec review found it in the 2D-calibrated evidence and four milestone scripts, which now name `oakOpenWalled`.

## Limits
- One preset per species (beech's world with the tree swapped), 100 seasons. The 20-seed claims are about this preset only.
- The reach runs are other realisations (a larger world changes the light), so they bound the reach and do not unclip the 60 m runs.
- Cost: one seed, three runs each, one laptop. Snapshot timing is the worker's `snapshot` call without drawing.
