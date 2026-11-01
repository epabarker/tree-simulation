# The night of 2026-11-01: round 5 under ADR 0032

The user's plan (steps 3–5), with its stop rules: `npm run check` fails twice; the pilot's LM rejects every step; a species' stand is dead at 100 in verification; disk under 5 GB; anything needing a principle, bound, target or golden change beyond ADR 0032's. One commit per step, pushed. Nothing is adopted into `flora-fitted.ts`.

Disk at the start: 619 GB free.

## Step 3: the phone budget: holds, proceed

**Decision: the budget holds on the phone's 66-cell plate. Proceeding.** Worker 32.1 ms a season at 40 and 40.7 ms at 100 (limit 250). Memory 74.9 MB at 200 seasons (limit 256). Measured before (b99a153, in a scratch worktree) and after (437a57d, ADR 0032). Files are in `budget/`: `memory.ts` jsonl and `garden-bench.mjs`, headless Firefox at 390 × 844, dpr 2, seed 10.

| measure | before ADR 0032 (b99a153) | after (437a57d) |
|---|---|---|
| phone plate (66 cells), WASM memory at 200 seasons | 74.2 MB | 74.9 MB |
| phone plate, live metamers at 200 | 18,440 | 20,713 |
| garden ?bench, phone viewport (390 × 844, dpr 2), seed 10, 40 seasons: worker ms a season (mean / max) | 25.5 / 40 | 32.1 / 45 |
| the same: draw p95 / frame p95 (ms); long frames | 5 / 17.3; 5 | 7 / 17.4; 62 |
| the same: metamers on screen | 11,027 | 12,157 |
| garden ?bench, 100 seasons: worker ms (mean / max) | 37.6 / 67 | 40.7 / 87 |
| the same: draw p95 / frame p95; long frames | 5 / 17.3; 72 | 6 / 17.3; 91 |
| the same: metamers on screen | 12,654 | 12,325 |
| 160-cell plate + specimen (memory.ts), WASM memory at 200 | 312.5 MB | 342.5 MB |
| the same: live metamers at 200 | 85,252 | 120,590 |

The 160-cell plate with the specimen is over 256 MB both before and after. Per the plan, that is recorded in STATUS's known issues as I3's problem and not acted on. All numbers are also in ADR 0032's consequences.

## Step 4: the sweep, the grids and the picks under ADR 0032

`step4.sh` ran under `systemd-inhibit`, 00:15–01:41 (log `step4.log`):
- the form sweep and the grids, `--tag=-adr32` (`figures/2026-10-31-form-{sweep,grid}-adr32-<sp>-{60,100}.png`; the review's knobs and ranges, beech's combination grid);
- every grid cell's closed stand at 100 (`grid-stand.py`; tables `grid-stand-<sp>.csv`);
- the picks regrown at seeds 1–3 (`figures/2026-10-31-form-picks-adr32-<sp>-{60,100}.png`).

**The rule, as you set it:** cells whose middle row is alive ≥ 0.8 at 100 (seed 1; all four trees); then the deepest living limb crown ratio, and every cell within 0.05 of it; then the lone outline nearest the brief (profile RMS over its band plus |W/H − spread| over its band, the mean over 60 and 100). The picks are in `[form]`, flagged "provisional, picked overnight by the agent" (`write-picks.py`). **Beech stays at round 2's.**

| species | cells alive ≥ 0.8 | pick (cell: knobs) | living crown ratio | lone W/H at 60 / 100 | lone H at 100 | best-outline alternative (its crown ratio, W/H at 60, H) |
|---|---|---|---|---|---|---|
| hornbeam | 39 / 48 | 1-0-1: aC 17, dΛ 0.04, λ0 0.58 | 0.58 | 0.41 / 0.32 | 205 | 0-1-1 (0.39, 0.52, 193) |
| birch | 48 / 48 | 3-3-0: λ0 0.59, λ1 0.55, posture 50 | 0.43 | 0.73 / 0.60 | 169 | 1-1-0 (0.19, 0.57, 118) |
| oak | 48 / 48 | 0-3-2: aC 20, dΛ 0.10, κ 1.5 | 0.68 | 0.87 / 0.65 | 202 | the same cell |
| maple | 48 / 48 | 1-0-2: aC 10, dΛ 0.04, λ0 0.60 | 0.78 | 0.22 / 0.18 | 204 | 0-0-0 (0.52, 0.68, 110) |
| willow | 48 / 48 | 1-3-0: λ1 0.493, sp1 90, sp2 54 | 0.67 | 1.52 / 1.35 | 84 | 2-1-0 (0.59, 1.09, 96) |
| rowan | 48 / 48 | 1-1-1: aC 26.7, dΛ 0.013, sp1 27.5 | 0.71 | 0.42 / 0.39 | 150 | the same cell |
| holly | 48 / 48 | 1-1-0: λ0 0.533, dΛ 0.02, sp1 20 | 0.95 | 0.76 / 0.50 | 109 | 2-0-2 (0.85, 0.42, 164) |

**Read this before the panels.** The stand-first rule picks **columns for hornbeam and maple** (W/H 0.18–0.41, at the 200-cell top by 100). Low dΛ keeps the leader, and in a closed stand a column holds the deepest living crown. The rule was applied as written; the best-outline alternative is beside each pick, one edit away in `[form]`. **Under ADR 0032 every cell of every grid keeps its stand alive at 100,** except 9 of hornbeam's 48. Oak's and rowan's picks are also their best outlines.

**Seeds 1–3** (W/H / fork / H): no pick changes kind.
- **Hornbeam:** a column on all three (W/H 0.28–0.37 at 100, H 205).
- **Maple:** a pole (W/H 0.18–0.21 at 100).
- **Birch:** a spire (0.58–0.67).
- **Oak:** a broad crown at 60 that runs to the top by 100 (W/H 0.65–0.68, H 190–204).
- **Willow:** a low broad crown (W/H 1.13–1.35, H 84–88).
- **Rowan:** slender (0.37–0.44).
- **Holly:** forks low at 60 (fork 0.06–0.21) and holds a leader by 100 (0.75–0.84).
- **Beech:** at round 2's form, a spire (0.47–0.63).

**The lab panels** (`figures/2026-10-31-species-panel-<sp>-form-adr32.png`, round 2's form above the pick, both under ADR 0032; `step4-panel.sh`, 01:42–02:12). Seed 1; the stand is the middle row at 100.

| species | lone 100 (H, W/H): round 2 → pick | stand 100 (H, limb crown ratio): round 2 → pick | LAI | floor |
|---|---|---|---|---|
| hornbeam | 150, 1.06 → 205, 0.32 | 147, 0.61 → 203, 0.58 | **8.6 → 4.4** | **2.2% → 5.2%** |
| maple | 83, 1.01 → 204, 0.18 | 78, 0.53 → 174, 0.78 | **12.7 → 5.3** | **3.2% → 7.4%** |
| birch | 167, 0.36 → 169, 0.60 | 133, 0.37 → 136, 0.43 | 3.0 → 3.0 | 10.0% → 9.3% |
| oak | 161, 0.87 → 202, 0.65 | 128, 0.75 → 165, 0.68 | 2.7 → 1.4 | 6.6% → 7.8% |
| willow | 82, 1.49 → 84, 1.35 | 61, 0.65 → 75, 0.67 | 3.9 → 4.2 | 7.7% → 7.8% |
| rowan | 120, 0.60 → 150, 0.39 | 99, 0.67 → 121, 0.71 | 4.7 → 4.2 | 7.0% → 7.8% |
| holly | 106, 0.47 → 109, 0.50 | 91, 0.75 → 87, 0.95 | 7.9 → 8.6 | 4.2% → 4.4% |
| beech | 194, 0.55 (round 2's, unchanged) | 178, 0.36 | 6.9 | 4.5% |

**The flag for the morning: the rule's hornbeam and maple picks undo ADR 0032's reason.** Their columns reach the woods' top and halve the stand's LAI (hornbeam 8.6 → 4.4 against a measured 8.3 ± 1.5; maple 12.7 → 5.3). The floor brightens 2.3× (hornbeam 2.2% → 5.2% against the measured 1.3%). Round 2's form under ADR 0032 was closer on both. Oak's pick also reaches the top at 100 with half the LAI. These are provisional and one edit each; the best-outline cells are in the table above. I did not override the rule overnight.

## Step 5: the hornbeam pilot under the stand-death penalty: FAILS the rule. Stopped; no overnight

`m27_fit.py --method lm --start round2 --species hornbeam --out round5-pilot2 --pilot`, 02:15–02:29, with the step-4 `[form]` (the column, cell 1-0-1) and ADR 0032 (log `pilot2-hornbeam.txt`; results `fits/round5-pilot2/hornbeam.json`; panel `figures/2026-10-31-species-panel-hornbeam-round5-pilot2.png`).
- **LM:** start loss 52.0. LM 1 accepted (14.1, 3 measured in band), then four rejected steps. Not every step was rejected, so that stop rule did not fire.
- **Verification on fresh seeds 1001–1006: 1 of 6 measured in band.** Outside: stand.height (125 against 84 ± 13; start 158), lone.earlyShare (0.59 against 0.67 ± 0.05), stand.slenderness (110 against 86 ± 12), stand.lai (6.2 against 8.3 ± 1.5), shade.survivalLight (0.018 against 0.033 ± 0.01).
- **Stand alive** 1.0 at 60 and 1.0 at 100: that part of the rule passes.
- **Physiology moved hard:** α 2.81 → 2.50, L_h 92 → 45, m_f 0.082 → 0.114, r3.c 0.059 → 0.132, h_J 8.8 → 4.1. The fitted lone tree is a pole (W/H 0.21 at 100, H 199); its stand has LAI 3.6 and a 9.3% floor (panel, seed 1).
- **Gallery:** the fit's nearest reject is round 3's parasol at 3.62; the hand form is 0.68 from it.

**Decision: by your rule the pilot fails (1 of 6 in band), so the overnight for the eight was not started.** The cause looks like step 4's pick, not the fit. The stand-first rule chose a column whose stand starts at height 158 against a target of 84, and the physiology cannot bring that back without breaking the rest. For the morning, a re-pick of hornbeam's `[form]` before any new pilot: round 2's form, or the best-outline cell 0-1-1. Under ADR 0032, round 2's form had LAI 8.6 and a 2.2% floor (the step-4 panel). I did not re-pick or re-run overnight: that is a choice the plan does not cover.

## Where things stand (02:30)
- Pushed: step 3 (48043c2), step 4 (d3e805b), step 5 (this commit).
- Nothing adopted into `flora-fitted.ts`. No principle, bound, target or golden changed after ADR 0032.
- `[form]` holds the overnight picks, all flagged provisional. Hornbeam's and maple's are columns, which the panels show.
- Disk: 618 GB free.

## Morning (2026-11-01): the re-pick and the third hornbeam pilot: FAILS the rule. Stopped; no overnight

**The re-pick** (the user's rule, then the user's guard; `repick.py`, the species note's "form re-pick under ADR 0032"):
- hornbeam 2-3-2, birch 3-3-2, oak 0-3-0 (flagged: no candidate in the LAI band), willow 0-2-2, by the rule;
- maple 0-0-0, rowan and holly round 2's, by the user's choice;
- beech round 2's.

All seven `[form]`s carry the rule and the guard in their comment. Every replayed stand's hash matched its stored run. Hornbeam's picks regrown at seeds 1–3: `figures/2026-10-31-form-picks-adr32-hornbeam-{60,100}.png`. The other species were not regrown (the pilot failed first).

**The pilot.** `m27_fit.py --method lm --start round2 --species hornbeam --out round5-pilot3 --pilot`, on cell 2-3-2; log `pilot3-hornbeam.txt`, 1,189 s.
- **LM:** start loss 15.4; three accepted steps (9.62, 9.09, 7.23), then four rejected; the selection is LM's (loss 8.03, 4 in band).
- **On fresh seeds: 4 of 6 measured in band.** Stand alive 1.0 at 60 and 100.
- **The fit:**
  - stand LAI 8.06;
  - lone W/H 0.53 / 0.58 (60 / 100);
  - gallery: nearest reject round 3's parasol at 2.30, the hand form at 0.47 (no shape flag).
- **Margins on fresh seeds:**

| trait | kind | target ± band | start | fitted | margin |
|---|---|---|---|---|---|
| stand.height | measured | 84 ± 13 | 129 | 114 | **−16.7** |
| lone.earlyShare | measured | 0.67 ± 0.05 | 0.628 | 0.643 | 0.023 |
| stand.slenderness | measured | 86 ± 12 | 86.1 | 82.7 | 8.67 |
| stand.lai | measured | 8.3 ± 1.5 | 8.43 | 8.06 | 1.26 |
| stand.lateShare | measured | 1.23 ± 0.05 | 1.19 | 1.26 | 0.022 |
| shade.survivalLight | measured | 0.033 ± 0.01 | 0.0182 | 0.0182 | **−0.0048** |
| lone.slenderness | described | 58 ± 10 | 59.1 | 67.6 | 0.35 |
| stand.crownRatio | described | 0.55 ± 0.1 | 0.36 | 0.527 | 0.077 |

- **Physiology:**

| knob | from | to |
|---|---|---|
| α | 2.81 | 2.53 |
| L_h | 92 | 52 |
| r3.c | 0.059 | 0.105 |
| h_J | 8.8 | 18.7 |
| leafArea | 2.33 | 2.65 |

  m_f, qMin, r0 and m_w hardly move.
- **The panel's traits** (seed 1, `runs/panel-round5-pilot3/panel.json`; screenshots not taken):
  - stand at 100: H 124, LAI 5.8, floor 6.4%;
  - lone at 100: H 165.

**Decision: fails by the rule (4 of 6); the overnight for the eight was not started.** Both misses are as last night's but closer:
- **stand.height:** its margin is −16.7 (last night 125 against 84). The stand still starts at 129.
- **shade.survivalLight:** 0.018 against 0.033 ± 0.01. No active knob moves it (qMin stays 0.0124).
