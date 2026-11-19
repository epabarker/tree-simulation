# #135: the floored height rule at Choi's rates, on 20 seeds (2026-11-19)

**Ticket:** [#135](https://github.com/epabarker/tree-simulation/issues/135), step 5 of [#129](https://github.com/epabarker/tree-simulation/issues/129)'s chain. **ADR:** [0074](../decisions/0074-height-floored-extent-rule.md) (proposed). Built off by default: nothing here changes a default, a preset, a species or a golden.

**Question.** The rule `H40k2f` (level shoots extend with a chance that falls with the tree's height, L_x 10 m, k 2, floor 0.1; [the crown-extent probe](2026-11-13-crown-extent-probe.md) §1–3) was run there on three seeds with defects. Built as a principle with its defects settled, does it bring the lone tree's late crown-edge rate to Choi et al. 2001's 2–3 cm a season, and how does it leave ADR 0067's lone triad? With beech's B2 leader beside it, and in the candidate garden M?

**Code:** [`code/2026-11-19-floored-height/`](code/2026-11-19-floored-height/): `lone.ts` (one lone tree), `run.sh` and `arms.json` (the lone arms), `table.ts` (the lone tables and bars), `stand.ts` (the garden runs and their summary), `stand.py` (bar 6 and the stand H/D, through #134's `stand.py`).

## Answer (written after the runs)

**The rule fails the lone bars and passes the stand check, so by §2's verdict it is not recommended for adoption.**

- **It slows the late edge, but not to Choi's level.** Beech's median falls from 16.1 to 10.7 cm a season, birch's from 12.5 to 5.8 and maple's from 4.7 to 3.8. No beech or birch seed reaches 3 (maple 4 of 20). As in the crown-extent probe, the edge is set by the luckiest of thousands of level shoots, so a chance of 0.1–0.2 per shoot moves it far less than fivefold.
- **It narrows the crown and thins the stem.** W/H at 100 comes into 0.6–1.2 for hornbeam (19 of 20) and halfway for beech (11 of 20, median 1.50 → 1.18). H/D at 1.3 m moves away from its band in every species with one (beech median 75 → 116), so T2 and T3 fail. Heights are kept (medians 0.93–1.07 of HEAD's).
- **With B2, beech's W/H passes (17 of 20), but the tree is 45 m tall** (HEAD 35) and its H/D is 137. B2 adds to the rule's narrowing; neither touches the slenderness.
- **In the candidate garden M, the rule helps.** Canopy trees from season 100 rise from 133 to 164/ha, ADR 0068's band frames from 16 to 24 and the ≥ 7 cm canopy share frames from 18 to 27, canopy deaths fall from 10.1 to 8.2 a run, and hornbeam still passes bar 6 at 100 and 300. The phone (66 cells) gains a canopy tree in every season from 100 in 20 of 20 (M 19) at the same wall time. Thrown canopy trees rise from 4.3 to 6.4 a run.

## 1. The condition (step 1, before the rule was built)

The issue is conditional: the rule is needed only if the late edge rate at HEAD is still above Choi's.

- **The measure:** the crown-extent probe's (§3): the gain in mean crown radius (dbh.py's `cr_m`, the four core extents ÷ 4, here from the core's `crownWidth` and `crownDepth`) from season 60 to 100, in cm a season, of the lone open-grown tree (`loneTreeParams`). **Choi's level** is 2–3 cm/yr at that size; "above" is a median over seeds 1–20 above 3.
- **The run:** `head` of `arms.json`, six exemplars × seeds 1–20, run first and alone (`run.sh … head 1 20`), before any rule code changed.

**The condition holds: the rule is needed.** HEAD's late edge rate, seeds 1–20 (`table.ts runs/135-floored-height/head.jsonl`), median (range; seeds at or under 3 cm a season):

| species | edge 60–100 (cm/season) | above Choi's? |
|---|---|---|
| beech | 16.1 (13.2–19.1; 0 of 20) | **yes** |
| birch | 12.5 (3.5–15.1; 0 of 20) | **yes** |
| maple | 4.7 (1.7–7.4; 2 of 20) | **yes** |
| oak | 2.0 (−8.3–13.9; 10 of 20) | no |
| hornbeam | −0.0 (−0.1–4.9; 19 of 20) | no |
| holly | −0.0 (−0.0–0.5; 20 of 20) | no |

- Beech's 20 runs reproduce the [λ₀ confirmation](2026-11-16-beech-lam0-confirm.md)'s `head` row exactly (edge 16.1, 13.2–19.1; H/D 66–128, median 75; W/H at 100 1.31–1.62), so the lone build is unchanged since.
- Hornbeam, holly and (on its median) oak already sit at Choi's level: their crowns stop growing out after season 60. So bar E below applies to beech, birch and maple.

## 2. Arms and bars (fixed before any rule run)

Written and committed after the condition's HEAD runs and before any run of the rule. Nothing below this heading changes them.

### 2.1 The lone tree

The lone open-grown tree (`loneTreeParams`, ADR 0062's 60 m box), seeds 1–20, to season 100, read every 10 seasons and at 25 (`lone.ts`, through WASM). At most 10 simulators.

| arm | species | change |
|---|---|---|
| `head` | oak, maple, birch, beech, hornbeam, holly | none (the condition's runs) |
| `rule` | the six | the world's `c1`: `extentLimit` "height", `extentSpare` true, `extentScale` 40, `extentSteepness` 2, `extentFloor` 0.1 (`H40k2f`), under ADR 0074's held buds |
| `rule+B2` | beech | `rule`, and beech's `r2.levels.0.lambda` 0.6708 (B2, the λ₀ confirmation's `lam0+14`) on its own patch |

B2 is a lone-tree arm only: the user keeps today's beech in the stand, because B2 makes beech take about 0.89 of the garden's canopy ([the beech stand check](2026-11-16-beech-stand-check.md)). B2 without the rule is the λ₀ confirmation's `lam0+14` row, on the same seeds and the same lone build (nothing that reaches a lone tree has changed since), and is quoted from there, not re-run.

**Bars** (`table.ts`), each on 20 seeds with the count stated:
- **E, the late edge rate** (the issue's criterion): for each species whose HEAD median is above 3, at or under 3 cm a season in **≥ 15 of 20** seeds.
- **T1, W/H at 100** (`lone.spread`'s measure, the larger core extent ÷ height) in ADR 0067's 0.6–1.2, beech and hornbeam, in **≥ 15 of 20**.
- **T2, H/D at 1.3 m** (D pooled over a codominant fork, `cli/allometry.ts` `pooledDbh`) at 100 in `lone.slenderness`'s band (beech 40–56, hornbeam 48–68) in **≥ 15 of 20**.
- **T3, no species worse than HEAD** (the triad note's bar 5, all six): per species, the median distance from the H/D band at 100 (where a band exists: beech, hornbeam, birch 32–48, oak and maple 40–56) and from the W/H-at-100 band (beech, hornbeam) no larger than HEAD's; the median W ÷ Pretzsch's 95% edge at DBH 40 (where read) no larger than HEAD's; the median height at 100 at least 0.9 of HEAD's (the crown-extent probe's guard).
- **Reported, not gated:** W/H at 60 (bar 2: beech 0.4–0.8, hornbeam 0.5–0.9) with its in-band count and the seeds nearer the band than HEAD's on the same seed; **W at DBH 40 ÷ Pretzsch's edge** (bar 4, half weight), read only where the taper (D at 1.3 m ÷ the root metamer's D) is in 0.8–1.25, with its count of seeds at or under 1.2; H/D at 60; H, W, D and metamers at 100.

An arm **passes** if it meets E, T1, T2 and T3. `rule+B2` is read against HEAD by the same bars, and beside `rule`'s beech (does B2 add to the rule?).

### 2.2 The stand check

The garden (`forestParams(width, seed)`), widths 160 and 66, seeds 1–20, to season 300, natively, metamers at 100, 200 and 300 (`stand.ts`). At most 10 simulators.

| arm | world o4 | world c1 |
|---|---|---|
| `M` | s3d (`stubs`, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075) + `lightMemory` 2.5: the ramp re-probe's `M` | – |
| `MR` | as `M` | `rule`'s |

- **Reuse:** `M` at 160 cells is linked from [the ramp re-probe](2026-11-16-understorey-ramp-memory-probe.md)'s runs after each record's params are checked equal to this script's. At 66 cells `M` is re-run on this build: each hash must equal the ramp re-probe's (the reuse check, and the rule-off bit-identity of this build in the garden). If any differs, `M` at 160 is re-run too and the note says so.
- **Definitions:** the ramp re-probe's (its run.ts measures, unchanged): a canopy tree is drawn and over half the season's top height; per hectare on width × 64 cells of 0.25 m; frames 100, 200, 300.

**Bars** (`MR` against `M`):
- **S1, the gates** (#122): a canopy tree in every season after 50, and at 66 cells in every season from 100, each in **≥ 18 of 20** runs.
- **S2, #129's target 1:** canopy trees/ha from season 100 (the median over runs of each run's median) at least 120 **and** not below `M`'s, at 160 cells.
- **S3, the understorey kept:** ADR 0068's bar-1 frames (stems ≥ 7 cm at 200–400/ha) and bar-2 frames (a ≥ 7 cm canopy share ≥ 0.6) each no fewer than `M`'s, at 160 cells (60 frames).
- **S4, canopy deaths** per run (mean) at most 1.5× `M`'s, at 160 cells.
- **S5, bar 6** (the stand gate, #134's `stand.py`: per species, |median Tallo CR z| ≤ 1 on ≥ 8 canopy trees inside Tallo's support, seeds pooled, 160 cells, at 100 and 300): no species–season cell that passes under `M` fails under `MR`.
- **Reported:** thrown canopy trees, the stand H/D per species against `stand.slenderness` (beech 70–94, hornbeam 74–98), drawn stems/ha, cap seasons, and the wall time at 66 cells (the phone's cost) against `M`'s.

The rule **passes the stand check** if it meets S1–S5.

**The verdict.** The rule is recommended for adoption on a species only if it passes the lone bars (§2.1) and the stand check. If it passes neither, the note says what it does and what it lacks; if the condition fails, it is not built.

## 3. Results

All 140 rule runs and 60 garden runs finished; every lone tree was alive at 100.

### 3.1 The lone tree (seeds 1–20)

`table.ts runs/135-floored-height/head.jsonl runs/135-floored-height/rule.jsonl`. Ranges are over seeds 1–20; counts in brackets are seeds in the band or bar.

| arm | species | n (alive 100) | edge 60–100 cm/season: median (range; seeds ≤ 3) | W/H 100: median (range; in 0.6–1.2) | H/D 100: median (range; in band); median distance | H/D 60 (in band) | W/H 60: median (in band; nearer than HEAD) | W ÷ Pretzsch at DBH 40: median (range; read of reached; ≤ 1.2) | the same, every seed reached, taper not read: median (range) | H 100 m: median (range) | W 100 m: median | D 1.3 m 100 cm: median | metamers 100 (k): median |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| head | holly | 20 (20) | -0.0 (-0.0–0.5; 20) | 1.15 (0.78–1.98; –) | 201 (62–330; –); – | 65–333 (–) | 1.15 (–; –) | – (–; 0 of 0; 0) | – (–) | 15.3 (15.0–15.9) | 17.7 | 8 | 13 |
| head | maple | 20 (20) | 4.7 (1.7–7.4; 2) | 1.19 (1.04–1.37; –) | 107 (71–188; 0); 50.6 | 71–188 (0) | 1.23 (0; –) | – (–; 0 of 0; 0) | – (–) | 26.1 (23.6–27.7) | 30.4 | 24 | 47 |
| head | oak | 20 (20) | 2.0 (-8.3–13.9; 10) | 1.35 (1.03–1.71; –) | 161 (139–206; 0); 104.8 | 166–264 (0) | 1.27 (0; –) | – (–; 0 of 0; 0) | – (–) | 33.3 (32.9–34.6) | 45.3 | 21 | 80 |
| head | beech | 20 (20) | 16.1 (13.2–19.1; 0) | 1.50 (1.31–1.62; 0) | 75 (66–128; 0); 18.8 | 59–128 (0) | 1.62 (0; –) | – (–; 0 of 12; 0) | 3.85 (3.19–4.31) | 34.7 (32.4–37.5) | 52.8 | 47 | 247 |
| head | hornbeam | 20 (20) | -0.0 (-0.1–4.9; 19) | 1.16 (0.95–1.38; 10) | 115 (62–172; 1); 47.1 | 66–175 (1) | 1.16 (0; –) | – (–; 0 of 1; 0) | 2.87 (2.87–2.87) | 29.1 (28.9–29.6) | 33.7 | 25 | 87 |
| head | birch | 20 (20) | 12.5 (3.5–15.1; 0) | 1.59 (1.27–1.76; –) | 124 (56–169; 0); 76.2 | 71–264 (0) | 1.48 (–; –) | – (–; 0 of 4; 0) | 5.75 (5.22–6.52) | 32.6 (30.4–37.7) | 51.6 | 26 | 123 |
| rule | holly | 20 (20) | -0.0 (-0.0–0.3; 20) | 1.09 (0.69–1.58; –) | 235 (86–520; –); – | 86–520 (–) | 1.09 (–; –) | – (–; 0 of 0; 0) | – (–) | 15.4 (15.2–15.9) | 16.8 | 7 | 9 |
| rule | maple | 20 (20) | 3.8 (1.5–6.8; 4) | 0.96 (0.77–1.17; –) | 132 (77–200; 0); 75.6 | 90–202 (0) | 1.07 (1; 16) | – (–; 0 of 0; 0) | – (–) | 27.8 (25.3–33.8) | 27.7 | 21 | 36 |
| rule | oak | 20 (20) | 4.3 (0.1–8.5; 6) | 1.09 (0.81–1.29; –) | 198 (139–229; 0); 141.8 | 185–285 (0) | 0.93 (13; 20) | – (–; 0 of 0; 0) | – (–) | 33.1 (31.8–34.1) | 36.2 | 17 | 43 |
| rule | beech | 20 (20) | 10.7 (8.6–12.9; 0) | 1.18 (1.05–1.35; 11) | 116 (56–188; 0); 59.8 | 60–213 (0) | 1.30 (0; 19) | – (–; 0 of 3; 0) | 3.14 (2.83–3.44) | 32.9 (30.7–36.4) | 38.9 | 28 | 130 |
| rule | hornbeam | 20 (20) | 1.0 (-0.1–5.7; 16) | 0.97 (0.73–1.20; 19) | 160 (102–222; 0); 92.4 | 104–224 (0) | 1.01 (8; 15) | – (–; 0 of 0; 0) | – (–) | 29.3 (28.8–29.7) | 28.4 | 18 | 57 |
| rule | birch | 20 (20) | 5.8 (4.1–9.5; 0) | 0.98 (0.75–1.33; –) | 290 (150–517; 0); 242.2 | 193–651 (0) | 0.93 (–; –) | – (–; 0 of 0; 0) | – (–) | 30.2 (27.1–37.1) | 29.8 | 11 | 40 |
| rule+B2 | beech | 20 (20) | 7.8 (5.5–11.0; 0) | 0.69 (0.54–0.85; 17) | 137 (93–202; 0); 80.8 | 113–252 (0) | 0.80 (10; 20) | – (–; 0 of 3; 0) | 2.57 (2.40–2.83) | 45.2 (37.8–50.4) | 31.0 | 33 | 98 |

**B2 without the rule** (the λ₀ confirmation's `lam0+14`, same seeds and lone build): edge 14.9 (11.1–22.7; 0 of 20), W/H at 100 in band 12 of 20, H/D at 100 42–88 (5 in band), H at 100 39.3 m.

**Bar 4 is never read.** At DBH 40 the taper (D at 1.3 m ÷ the root metamer's D) is outside 0.8–1.25 in every seed of every arm, so W ÷ Pretzsch is reported unfiltered beside it (beech 3.85 at HEAD, 3.14 under the rule, 2.57 with B2). These use the pooled D at 1.3 m, which reaches 40 cm later and at a wider crown than the crown-extent note's dbh.py diameter, so they are not comparable with its 1.5–1.7.

### 3.2 By §2.1's bars

| arm | species | E: edge ≤ 3 (of 20) | T1: W/H 100 in band | T2: H/D 100 in band | T3: no worse than HEAD | passes |
|---|---|---|---|---|---|---|
| `rule` | beech | 0 ✗ | 11 ✗ | 0 ✗ | ✗ (H/D distance 18.8 → 59.8) | no |
| `rule` | hornbeam | n/a (HEAD 19 of 20) | 19 ✓ | 0 ✗ | ✗ (H/D distance 47.1 → 92.4) | no |
| `rule` | birch | 0 ✗ | – | – | ✗ (H/D distance 76 → 242) | no |
| `rule` | maple | 4 ✗ | – | – | ✗ (H/D distance 51 → 76) | no |
| `rule` | oak | n/a | – | – | ✗ (H/D distance 105 → 142) | no |
| `rule` | holly | n/a | – | – | ✓ | – |
| `rule+B2` | beech | 0 ✗ | 17 ✓ | 0 ✗ | ✗ (H/D distance 18.8 → 80.8) | no |

Heights at 100 hold (medians 0.93–1.07 of HEAD's, birch lowest; beech with B2 1.30×). W/H at 60 is nearer its band than HEAD's in 15–20 of 20 seeds for every species with one; in band for oak 13, hornbeam 8, beech 0 (rule) and 10 (rule + B2).

### 3.3 The stand check (seeds 1–20, to season 300)

**Reuse:** `M`'s 20 runs at 160 cells are the ramp re-probe's (params equal in every record); its 20 re-runs at 66 cells hash as the ramp re-probe's in 20 of 20 (`reuse-check.txt`), so the rule is bit-identical off in the garden too. `stand.ts` and `stand.py` (#134's `stand.py`):

| arm | width | gate 1 (runs) | gate 2 (runs) | canopy/ha from 100 (median; runs ≥ 120) | ≥ 7 cm band frames (of 60; median /ha) | ≥ 7 cm canopy share ≥ 0.6 (frames) | canopy deaths / run | thrown / run | light-demander frames | drawn /ha (median) | cap seasons (median) | wall s (median) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M | 160 | 20 | 20 | 132.8 (11) | 16 (297) | 18 | 10.05 | 4.30 | 49 | 1344 | 62.5 | 150 (linked runs) |
| MR | 160 | 20 | 20 | 164.1 (13) | 24 (344) | 27 | 8.20 | 6.40 | 58 | 1719 | 85.5 | 231 |
| M | 66 | 19 | 19 | 75.8 (3) | 5 (114) | 40 | 6.65 | 1.60 | 19 | 133 | 14.5 | 87 |
| MR | 66 | 20 | 20 | 113.6 (9) | 19 (227) | 39 | 3.75 | 2.80 | 36 | 417 | 23 | 87 |

| bar | `MR` against `M` | |
|---|---|---|
| S1 gates | 20 / 20 at both widths (`M` 19 at 66) | ✓ |
| S2 canopy/ha from 100 ≥ 120 and ≥ `M`'s | 164 against 133 | ✓ |
| S3 bar-1 / bar-2 frames ≥ `M`'s | 24 / 27 against 16 / 18 | ✓ |
| S4 canopy deaths ≤ 1.5× `M`'s | 8.2 against 10.1 | ✓ |
| S5 bar 6's passing cells kept | hornbeam passes at 100 (z 0.73) and 300 (0.33), as under `M` (−0.74, −0.08); beech, birch, maple and oak fail under both | ✓ |

**`MR` passes the stand check.** Reported beside it:
- **Stand H/D moves toward its band:** beech 67 / 47 → 73 / 62 at 100 / 300 (band 70–94), hornbeam 40 / 69 → 58 / 71 (74–98).
- **More of the canopy is light-demanding early:** at 100, birch 64, willow 43 and rowan 35 canopy trees against 43, 16 and 29; hornbeam's share of the canopy at 300 falls from 0.74 to 0.45 and beech's rises from 0.13 to 0.23.
- **Thrown trees rise** (4.3 → 6.4 a run at 160 cells), and so do the cap seasons (62.5 → 85.5; the phone 14.5 → 23).
- **The 160-cell wall** (231 against 150 s) is not comparable: `M`'s runs were made in another load. At 66 cells, both run here, the median is 87 s for each.

## 4. Verdict

- **The lone bars fail** for every species: E (no beech or birch seed reaches Choi's level), T2 (no seed of beech or hornbeam in its H/D band) and T3 (every species with an H/D band moves away from it).
- **The stand check passes:** S1–S5, with gains on #129's target 1 and ADR 0068's bars 1–2.
- **So, by §2's rule, the rule is not recommended for adoption.** It stays built and off.
- **What it lacks:**
  - a dose that reaches Choi's rate: the chance form slows the mean shoot, not the edge;
  - a stem that thickens with it: R3 sizes the bole from the crown, so narrower crowns are thinner stems (the crown-extent probe §5), and the lone H/D gets worse whatever narrows the crown;
  - for beech with B2, a height that stays in range.

## 5. Decisions for the user

1. **Close #135 as built-and-not-adopted, or carry the rule into the garden alone?** It fails its lone bars but improves the candidate garden on every stand bar. Adopting it for the garden only would be a new decision (the lone trees would then grow under it too, unless the rule were set on the garden's species patches and not on `loneTreeParams`).
2. **Is a stronger dose worth a probe?** At L_x 10 m the edge falls about a third; Choi's fivefold needs a much steeper g, which the crown-extent probe's `H4k8` showed is a constant handicap on level shoots, not a size signal.
3. **The lone H/D** stays the blocker for every crown-narrowing arm so far. It needs #134's slenderness work (or a girth change in §R3), not another crown rule.
4. **ADR 0074** stays proposed. Accept it as the record of the built rule (and its §C1 item 1 exception), or leave it proposed until a species adopts the rule.

## Limits

- The lone trees run to season 100 only; Choi's floor is read at 60–100.
- Bar 4 is unreadable on this build's taper window, so W at matched DBH is reported unfiltered.
- `M`'s 160-cell runs were made on another commit (6a1bd67); the 66-cell hashes show the garden unchanged since.
- One calibration (`H40k2f`); no dose was screened.

## Reproduce

```
bash docs/experiments/code/2026-11-19-floored-height/run.sh docs/experiments/code/2026-11-19-floored-height/arms.json head 1 20 10 head
bash docs/experiments/code/2026-11-19-floored-height/run.sh docs/experiments/code/2026-11-19-floored-height/arms.json rule 1 20 10 rule,rule+B2
node docs/experiments/code/2026-11-19-floored-height/table.ts runs/135-floored-height/head.jsonl runs/135-floored-height/rule.jsonl
node docs/experiments/code/2026-11-19-floored-height/stand.ts -j 10 --reuse <the ramp re-probe's runs/132-ramp-memory>
uv run --project analysis python -I docs/experiments/code/2026-11-19-floored-height/stand.py
```

Runs (not committed): `runs/135-floored-height/`.

