# #134: beech's leader λ₀ on 20 seeds, the lone tree (2026-11-16)

**Confirmation, lone tree only.** Seeds 1–20, to season 100. It follows the form-knob screen (PR #149, [its note](2026-11-16-form-knob-screen.md) §5), which named beech `lam0+14` for a 20-seed confirmation with `lam0+20` beside it. Nothing here is adopted: an arm that passes goes to the stand check, the gate (ADR 0067), which runs with the seedling stubs (`s3d`) on and off.

## 1. Question

On 20 seeds, does a stronger beech leader (`r2.levels.0.lambda`, HEAD 0.531) put the lone beech's W/H at 100 in ADR 0067's 0.6–1.2, and how does it leave H/D at 1.3 m, W/H at 60, the tree's height and the late crown-edge rate?

## 2. Arms (fixed before any run)

Each arm sets dotted paths on beech's own patch (`cli/trials.ts` `withAssign`), as the screen did.

| arm | change | why |
|---|---|---|
| `head` | none | the baseline |
| `lam0+14` | `levels.0.lambda` 0.6708 | the screen's pick: W/H at 100 in band in 4 of 5 |
| `lam0+20` | `levels.0.lambda` 0.7308 | the screen's stronger dose: 5 of 5, stems more scattered |
| `lam0+14&Lh` | `lam0+14` and a lower `r1.Lh` (dose by §2.1) | `lam0+14` is 39–42 m at 100 against HEAD's 34–36: the same leader on HEAD's height |

**Why `r1.Lh`.** L_h is R1's hydraulic path-length scale (beech 108.9 cells, `hydraulic: "hyperbolic"`: production × 1/(1 + L/L_h), L the path length to the tips). It is one of the spec's two plateau causes (ADR 0010; the other, reproduction, also acts through maturity) and the lever the fits have used for height: ADR 0050 records the beech fit's L_h 109 → 68 taking H at 150 from 48 to 29 m. It acts on every shoot through its path length, so it bounds a tall tree more than a small one, and it is not a form knob: ADR 0050 found the physiology knobs (`r1.*` among them) do not move the crown ratio. The alternatives were set aside:
- `c1.extentLimit` limits a lateral's reach, not height, and is an off probe param (#129 rejected every arm);
- the box's top (52 m) does not bind at 39 m;
- `r2.hJ` and `r2.dLambda` act on the young tree or on λ itself, and would confound the leader's dose.

**Risk, stated before the runs:** a lower L_h shortens the tree without narrowing the crown, so W/H can rise back; ADR 0050 also saw a thinner trunk with it.

### 2.1 The L_h dose (fixed before the pilot)

A pilot on seeds 101–103 (outside the confirmation's 1–20, so the dose is not picked on the seeds that judge it): `head`, `lam0+14`, and `lam0+14` with L_h 90, 75 and 60 (`code/2026-11-16-beech-lam0-confirm/pilot.json`). The confirmation's dose is the one whose median H at 100 over the three seeds is nearest HEAD's median on the same seeds. If none is within 1.5 m, the nearest bracketing pair is interpolated linearly to one dose and that dose goes in untested. The pilot's numbers are written in §4.1 before the confirmation runs.

**Runs:** the screen's `lone.ts` (it now also prints the mean crown radius), 4 arms × seeds 1–20 = 80 runs, at most 6 simulators at once (`code/2026-11-16-beech-lam0-confirm/run.sh`). Read at 25, 60 and 100. One timing run (HEAD, seed 1) ran before this note: 44 s, H 33.6 m, W/H 1.49 at 100.

## 3. Bars (fixed before any run)

The triad note's §5 bars as amended by ADR 0067, on 20 seeds with the pass rate stated:
1. **W/H at 100** (`lone.spread`'s measure: the larger of the core's crown width and depth over height) in 0.6–1.2 in **≥ 15 of 20** seeds (bar 3).
2. **H/D at 1.3 m**, D pooled over a codominant fork below it (`cli/allometry.ts` `pooledDbh`), in `lone.slenderness`'s band 40–56 at 100 in **≥ 15 of 20** (bar 1). H/D at 60 is reported with its count.
3. **W/H at 60** (bar 2, 0.4–0.8) is read only as **nearer than HEAD**: the arm's distance from the band below HEAD's on the same seed, in ≥ 15 of 20. The in-band count is reported.

An arm passes **the triad** if it meets 1 and 2. Because the screen put every beech arm's H/D at 62–122, outside the band, an arm also **qualifies for the stand check** if it meets 1 and 3 and its median distance from the H/D band at 100 is no larger than HEAD's (bar 5: no worse than HEAD). If two arms qualify, the one with more seeds in bar 1 goes; within two seeds of each other, the shorter tree at 100 goes, because every leader arm in the screen was taller than HEAD and the anchors (below) already call HEAD tall.

**Reported, not gated:**
- **Crown width W at 100 (m) and lone height H at 60 and 100.** The anchors (`analysis/fit/targets/beech.toml`, `stand.height`): stand top height at 100 of 28.5–32.5 m (site index ≈ 27–33 m), and its `lone.spread` source calls a lone beech of 25 m at 60 tall for an open-grown tree.
- **The late crown-edge rate,** #134's last criterion: the gain in mean crown radius (over ±x and ±z, dbh.py's `cr_m`) from season 60 to 100, in cm per season, as the crown-extent note's §3 read it. HEAD's beech was 14–16 there; Choi's is 2–3 at that size. #134: if it stays above Choi's, the floored height rule (the next ticket) is unblocked; if not, that ticket closes as not needed.

Not read: bar 4 (W ÷ Pretzsch at DBH 40), the namer panel, the stand gate (bars 6–8), other species (bar 5's other half).

## 4. Results

### 4.1 The L_h pilot (seeds 101–103)

Written before the confirmation ran. Per seed 101, 102, 103 (the median is the middle one):

| arm | H at 100 (m) | median H | W/H at 100 | H/D at 100 | W/H at 60 |
|---|---|---|---|---|---|
| `head` | 35.4, 37.4, 35.2 | 35.4 | 1.44, 1.39, 1.46 | 84, 91, 89 | 1.52, 1.54, 1.56 |
| `lam0+14` | 38.3, 37.7, 36.1 | 37.7 | 1.32, 1.18, 1.31 | 52, 56, 53 | 1.37, 1.25, 1.26 |
| `lam0+14`, L_h 90 | 43.6, 37.8, 37.4 | 37.8 | 0.97, 1.04, 1.15 | 183, 67, 56 | 0.88, 1.07, 1.25 |
| `lam0+14`, L_h 75 | 43.7, 35.4, 36.8 | 36.8 | 1.03, 1.42, 1.07 | 108, 71, 83 | 1.21, 1.24, 1.13 |
| `lam0+14`, L_h 60 | 38.5, 32.3, 32.3 | 32.3 | 1.02, 1.18, 1.27 | 83, 69, 52 | 0.88, 1.27, 1.10 |

**The dose is L_h 75** (§2.1's rule): its median is 1.4 m from HEAD's, the only one within 1.5 m (L_h 90: 2.4 m; 60: 3.1 m). The arm is `lam0+14&Lh75` (`confirm.json`).

**Seen on three seeds, not judged:** L_h does not lower height monotonically. Seed 101 is 43.6–43.7 m at L_h 90 and 75, taller than at HEAD's L_h. The lower L_h also narrowed the crown rather than widening it (W/H at 100 about 1.0–1.1 in two of three seeds), and the stems scatter more (H/D 52–183).

### 4.2 The confirmation (seeds 1–20)

_To be filled._

## 5. Recommendation

_To be filled._

## Files

- `code/2026-11-16-beech-lam0-confirm/`: `pilot.json`, `confirm.json` (the arms), `run.sh`, `table.ts`.
- `code/2026-11-16-form-knob-screen/lone.ts`: the run, shared with the screen.
- Runs (not committed): `runs/134-beech-lam0/{pilot,confirm}.jsonl`.
