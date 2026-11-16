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

All 80 runs finished, and every tree was alive at 100. The table comes from `code/2026-11-16-beech-lam0-confirm/table.ts`. Ranges are the minimum and maximum over seeds 1–20. Counts in brackets are seeds in the bar, out of 20.

| arm | W/H 100 (in 0.6–1.2) | H/D 100 (in 40–56); median distance | H/D 60 (in 40–56) | W/H 60 (in 0.4–0.8; nearer than HEAD) | H 60 m: median | H 100 m: median (range) | W 100 m: median (range) | D 1.3 m 100 cm | edge 60–100 cm/season: median (range; ≤ 3) | metamers 100 (k) |
|---|---|---|---|---|---|---|---|---|---|---|
| `head` | 1.31–1.62 (0) | 66–128 (0); 18.8 | 59–128 (0) | 1.43–1.77 (0; –) | 24.2 | 34.7 (32.4–37.5) | 52.8 (48.3–55.8) | 27–52 | 16.1 (13.2–19.1; 0) | 233–274 |
| `lam0+14` | 0.82–1.49 (12) | 42–88 (5); 5.8 | 54–181 (1) | 0.85–1.48 (0; 19) | 28.5 | 39.3 (35.0–45.1) | 45.1 (37.2–52.3) | 49–84 | 14.9 (11.1–22.7; 0) | 157–207 |
| `lam0+20` | 0.85–1.48 (15) | 40–167 (6); 13.0 | 49–214 (2) | 0.82–1.45 (0; 20) | 28.7 | 40.0 (33.6–43.1) | 44.0 (35.8–51.0) | 26–89 | 16.5 (8.1–22.2; 0) | 140–180 |
| `lam0+14&Lh75` | 0.96–1.53 (15) | 43–108 (5); 12.8 | 56–164 (1) | 0.93–1.69 (0; 20) | 26.7 | 36.2 (31.0–40.0) | 41.2 (36.7–53.1) | 35–80 | 12.9 (9.1–24.2; 0) | 111–147 |

Medians: W/H at 100 is 1.50 (HEAD), 1.14, 1.12, 1.13; H/D at 100 is 75, 62, 69, 69; W/H at 60 is 1.62, 1.16, 1.09, 1.15; W/H at 25 is 1.72, 1.30, 1.18, 1.21.

**By §3's rule:**
- **No arm passes the triad.** H/D at 1.3 m is in 40–56 at 100 in 5–6 of 20 seeds on every leader arm (HEAD 0 of 20), and at 60 in 1–2 of 20.
- **`lam0+20` and `lam0+14&Lh75` qualify for the stand check:** W/H at 100 in band in 15 of 20, bar 2 nearer than HEAD in 20 of 20, and H/D's median distance from the band (13.0, 12.8) below HEAD's 18.8.
- **`lam0+14` does not:** W/H at 100 in band in 12 of 20. The screen's 4 of 5 did not hold on 20 seeds. Its H/D is the nearest to the band (median distance 5.8, median 62).
- **The tie-break picks `lam0+14&Lh75`:** both qualifiers have 15 seeds in bar 1, and it is the shorter tree (36.2 m median at 100, against 40.0).

**What else the runs show:**
- **Bar 2 is missed by every seed of every arm.** W/H at 60 is 0.82–1.69 against 0.4–0.8. The leader takes it from HEAD's 1.62 to about 1.1–1.15, half the way.
- **The crown is narrower in metres, not only in ratio.** W at 100 is 41–45 m against HEAD's 53. At 60 it is 31–33 m against 40.
- **The trees are tall.** At 60 every leader arm is 26.7–28.7 m (HEAD 24.2), past the 25 m that `beech.toml`'s spread source already calls tall for an open-grown beech. At 100, `lam0+14&Lh75` is 36.2 m (HEAD 34.7). The others are 39–40 m. All are above the stand top height of 28.5–32.5 m, as HEAD is.
- **L_h 75 costs leaf, not height.** The tree carries 111–147k metamers against `lam0+14`'s 157–207k, and its stems are thinner (35–80 cm, against 49–84). That is why its H/D is further from the band than `lam0+14`'s.
- **`lam0+20` scatters most.** D is 26–89 cm and H/D 40–167, with 2 seeds over 110.
- **The late edge rate stays far above Choi's.** It is 13–17 cm a season (median; 8–24 over seeds) on every arm, against HEAD's 16 and Choi's 2–3. No seed of any arm is at or under 3. By #134's criterion, **the floored height rule (the next ticket) is unblocked.**

## 5. Recommendation

- **Send `lam0+14&Lh75` to the stand check** (λ₀ 0.6708, `r1.Lh` 75), with stubs (`s3d`) on and off.
  - It is §3's pick: W/H at 100 in band in 15 of 20 seeds (HEAD 0), bar 2 nearer than HEAD in 20 of 20, and H/D no worse than HEAD.
  - Its height at 100 is close to HEAD's (36.2 against 34.7 m).
  - L_h acts on every beech in the stand, so the check reads the stand's height (`stand.height`) and H/D as well as the gate.
- **Carry `lam0+14` beside it in the stand check if the budget allows.** It misses bar 1 by three seeds (12 of 20), but it has the best H/D (median 62, 5.8 from the band against 12.8), the thickest stems, and keeps HEAD's L_h. Its only change is to λ₀.
- **Drop `lam0+20`.** It ties `lam0+14&Lh75` on bar 1, but is 4 m taller and has the most scattered stems.
- **Not settled by any arm:**
  - H/D at 1.3 m (bar 1) is in band in at most 6 of 20.
  - W/H at 60 (bar 2) is in band in no seed.
  - The lone tree is taller than the anchors at 60 and 100.
  - None of these can be reached with the form knobs here. The adoption claim needs the triad, so this is a candidate for the stand gate, not an adoptable change.
- **The late edge rate (13–17 cm a season) unblocks the floored height rule,** per #134's last criterion.
- **Still to do before any adoption:** the namer panel (a beech at W/H 1.1 against the 1.50 panel check), the other species (bar 5), and the goldens.

## Files

- `code/2026-11-16-beech-lam0-confirm/`: `pilot.json`, `confirm.json` (the arms), `run.sh`, `table.ts`.
- `code/2026-11-16-form-knob-screen/lone.ts`: the run, shared with the screen.
- Runs (not committed): `runs/134-beech-lam0/{pilot,confirm}.jsonl`.
