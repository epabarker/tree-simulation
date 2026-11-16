# #134: the stand check for beech's leader candidates, with and without stubs (2026-11-16)

**Ticket:** [#134](https://github.com/epabarker/tree-simulation/issues/134). It follows [the λ₀ confirmation](2026-11-16-beech-lam0-confirm.md) (PR #151), whose §5 sends `lam0+14&Lh75` to the stand check and carries `lam0+14` beside it. The bars are [the triad re-read](2026-11-13-triad-reread.md)'s §5 as amended by [ADR 0067](../decisions/0067-lone-triad-measures.md), and #122's gates as [the seedling-stubs probe](2026-11-16-seedling-stubs-probe.md) reads them. The stubs are [ADR 0072](../decisions/0072-seedling-stubs.md)'s `s3d`. **Nothing is adopted:** no flora, preset, golden or regression changes, and no new param.

## 1. Question

Does either beech candidate pass the stand gate against Tallo at least as well as HEAD does, with the seedling stubs off and with them on? And do the stubs change that answer?

## 2. Arms (fixed before any run)

Beech's change is set on beech's own species patch by dotted paths (`cli/trials.ts` `withAssign`), as in the lone confirmation. The stubs are world params, as in the stubs probe.

| arm | beech | stubs |
|---|---|---|
| `head` | HEAD (λ₀ 0.5308, `r1.Lh` 108.9) | off |
| `s3d` | HEAD | `o4.stubs` on, `stubLight` 0.15, `stubDeath` 3, `stubDemote` 0.075 |
| `B1` | `r2.levels.0.lambda` 0.6708, `r1.Lh` 75 (the confirmation's `lam0+14&Lh75`) | off |
| `B2` | `r2.levels.0.lambda` 0.6708 alone (`lam0+14`) | off |
| `B1s3d` | as `B1` | as `s3d` |
| `B2s3d` | as `B2` | as `s3d` |

**Runs:** the garden (`forestParams(width, seed)`) at widths 160 and 66, seeds 1–20, to season 300, natively. Metamers are kept at seasons 100, 200 and 300. At 160 cells the runs also write `--light` (`ground.csv`), for the floor light. The script is [`code/2026-11-16-beech-stand-check/run.ts`](code/2026-11-16-beech-stand-check/run.ts), at most 10 simulators at once.

**Reuse:**
- `head` and `s3d` at 66 cells are linked from the stub-churn probe's runs. Those were made at 7557066, whose `rust/` is this build's, and they matched the stubs probe's hashes.
- `head` and `s3d` at 160 cells are re-run here, because the floor light needs `--light`, which those runs lack. Each re-run's `hash.txt` is compared with the stubs probe's run of the same arm and seed (`reuse-check.txt`). If any differs, the 66-cell runs are re-run too and the note says so.

## 3. Definitions

These are the stubs probe's definitions, with the triad note's measures added.
- **A canopy tree:** drawn (≥ 1.3 m) and strictly over half the season's top height (`stand.csv` `topHeight100`).
- **DBH and crown:** the path-length note's `dbh.py` measure, read from `metamers.csv`. DBH is the trunk cylinder holding 1.3 m of stem, as Level 0's `dbh` is (unpooled). The crown radius is the mean over ±x and ±z of the farthest metamer tip from the trunk at 1.3 m. This is the tip measure (ADR 0067 decision 3); it reads every tip, so it is an upper bound on Level 0's live-bud reading. The robust crown (the 5–95% tip spreads) is reported beside it.
- **Tallo z:** `analysis/treesim/tallo.py` `z_score` on the species' CR curve in `analysis/fit/sources/tallo-level0.json` (v2). z = (ln y − q50)/(q90 − q50) above the median and (ln y − q50)/(q50 − q10) below it. A tree outside the curve's DBH support has no z.
- **Per hectare:** n / ha, with ha = width × 64 × 0.0625 m² / 10⁴ (0.064 at 160 cells, 0.0264 at 66).
- **Frames:** seasons 100, 200 and 300.

## 4. Bars (fixed before any run)

### Gated

1. **#122's gates:** at each width, a canopy tree in every season after 50 (gate 1). At 66 cells, also a canopy tree in every season from 100 (gate 2). Each must hold in **≥ 18 of 20** runs, per arm and width.
   - The stubs probe's gates 3 and 4 (checkpoints, and lone hornbeam hashes) are not re-run. They test the stub rule, which is unchanged since the churn probe passed them. Beech's species patch touches neither the checkpoint layout nor the lone hornbeam.
2. **The stand gate (bar 6):** at 160 cells, on the canopy trees, per species, at seasons 100 and 300 separately, seeds 1–20 pooled.
   - **The statistic:** |median z| ≤ 1 (Level 0's statistic).
   - **The floor:** it is read only on ≥ 8 trees inside Tallo's support. Where a season has fewer, it is pooled with season 200. If there are still fewer than 8, the cell is unreadable.
   - **Species:** every garden species with a gated CR curve (beech, hornbeam, oak, maple, birch, rowan, fir, pine; holly has no curve).
   - **A candidate passes the stand gate** if beech passes at both 100 and 300.
   - **A candidate does at least as well as its baseline** if both of these hold:
     - (a) at each season, beech passes or its |median z| is no larger than the baseline's;
     - (b) every species × season that passes in the baseline also passes in the arm.
   - **Baselines:** `head` for `B1` and `B2`; `s3d` for `B1s3d` and `B2s3d`. The comparison of `B1s3d` and `B2s3d` with `head` is reported beside it.

**The answer, per candidate:** "yes" if it passes gate 1 and does at least as well as its baseline on gate 2. "Passes" is said separately, only where the candidate also passes the stand gate outright. **The stubs change the answer** if B1's (or B2's) verdict against `head` differs from B1s3d's (or B2s3d's) against `s3d`.

### Reported, not gated

At 160 cells unless stated, medians over runs or over the pooled trees:
- **`stand.height100`:** the mean height of the canopy beech at season 100, pooled. It is read against `beech.toml`'s source band, 28.5–32.5 m (NW-FVA classes 1–2), and against the fit's band, 122 ± 26 cells (24.0–37.0 m). The per-run median and the garden's `topHeight100` are printed beside it.
- **The stand H/D (bar 7):** the canopy beech and hornbeam at 100 and 300, read two ways:
  - the core's `slenderness`, which is what `stand.slenderness` reads;
  - H over DBH at 1.3 m.
  Each is read against the bands, beech 70–94 and hornbeam 74–98.
- **Canopy trees/ha (bar 8, #129's target 1):** each run's median over seasons 100–300, and the number of runs with ≥ 120/ha in every season from 100. Both widths.
- **Stems ≥ 7 cm DBH per ha** at the frames, against ADR 0068's 200–400. Both widths.
- **Floor light:** `ground.csv`'s q (a fraction of open sky), the plot's mean at each frame (160 cells).
- **Species shares:** each species' share of the canopy trees at the frames, pooled, and its share of drawn stems (`stand-species.csv`).
- **Cap seasons:** `run.json` `meta.capSeasons`, as a median and per run, at both widths. This matters most with the stubs on.
- **Beside the gate:** Tallo's H z for each species; the crown ÷ q50; the robust crown ÷ q50; and n inside and beyond the support.

### Expected (written before the runs)

- At HEAD the triad note had beech's canopy crowns at 1.5–1.9× Tallo's q50 on the tip measure, so beech should fail bar 6 at HEAD.
- The leader narrows the lone crown by about 20% in metres (W at 100: 41–45 m against 53). In the stand, neighbours cap the crown, so expect a smaller change there.
- The risk is that `r1.Lh` 75 acts on every beech, including the young ones. Fewer beech may reach the canopy, leaving season 100 below the 8-tree floor.
- The stubs probe left canopy trees/ha and the canopy's species unchanged, so the stubs should not change the beech answer.

## 5. Results

The runs are at 0fd5720: 202 new runs in 95 min on 10 simulators, plus the 40 linked runs. **The reuse holds.** The 40 `head` and `s3d` re-runs at 160 cells have the stubs probe's hashes, 40 of 40 ([`reuse-check.txt`](code/2026-11-16-beech-stand-check/reuse-check.txt)). The linked 66-cell runs give the stubs probe's per-run cap seasons exactly. All the tables are in [`tables.md`](code/2026-11-16-beech-stand-check/tables.md), from `stand.py`.

### 5.1 The answer

**By §4's rule: no candidate does at least as well as its baseline, with the stubs off or on, so the stubs do not change the answer.** That verdict hides two different things:

- **On beech's own bar 6, `B2` is the only arm that passes outright.**
  - Stubs off: `B2`'s median z is 0.73 at 100 and 0.85 at 300, against HEAD's 1.48 and 1.65.
  - Stubs on: `B2s3d` fails at 100 (1.40) and passes at 300 (0.62).
  - `B1` and `B1s3d` fail at 100 (2.22 and 2.09). Their beech at 100 are larger trees, with a median DBH of 61–62 cm. Fewer of them are inside Tallo's support (16 and 14 trees), and those that are have wide crowns. Both pass at 300 (0.59 and 0.72).
- **Clause (b) fails because the candidates replace the other species in the canopy.**
  - **Beech takes the canopy.** At 160 cells it holds 78–92% of the canopy trees at 200 and 300 in `B1`, `B2` and `B2s3d`, and 49–67% in `B1s3d`. HEAD's beech holds 20–23% and `s3d`'s 11–16%.
  - **Hornbeam drops out of the readable range.** Its canopy trees fall from 116 (HEAD at 300) to 22–29, or 69 in `B1s3d`. The survivors are the old planted trees, at DBH 65–78 cm, beyond Tallo's 8–39 cm support. So the hornbeam cells become *unreadable* (2–8 trees inside the support), not failing.
  - **Maple** at 300, 9 trees at HEAD, nearly vanishes (1–2 trees).
  - `B1s3d` is the only candidate that keeps hornbeam readable and passing (z 0.25 and 0.15). It loses only maple@300.

| arm | baseline | #122 gates 1–2 | beech bar 6, z at 100 / 300 | (a) beech no worse | (b) cells the baseline passes, lost | at least as well |
|---|---|---|---|---|---|---|
| `head` | – | 20 / 20 (160), 20 / 20 (66) | 1.48 (+200) / 1.65 ✗ ✗ | – | – | – |
| `s3d` | – | 20, 19 / 19 | 1.27 (+200) / 1.71 ✗ ✗ | – | – | – |
| `B1` | head | 20, 20 / 20 | 2.22 / 0.59 ✗ ✓ | no | hornbeam@100, @300 (unreadable), maple@300 | **no** |
| `B2` | head | 20, 19 / 19 | 0.73 / 0.85 ✓ ✓ | yes | hornbeam@300 (unreadable), maple@300 | **no** |
| `B1s3d` | s3d | 20, 20 / 20 | 2.09 / 0.72 ✗ ✓ | no | maple@300 | **no** |
| `B2s3d` | s3d | 20, 20 / 20 | 1.40 / 0.62 ✗ ✓ | no | hornbeam@100, @300 (unreadable), maple@300 | **no** |

(+200): pooled with season 200 below the 8-tree floor. Every arm passes #122's gates, at ≥ 19 of 20 runs at each width.

### 5.2 Reported

| arm | canopy/ha, 160 / 66 (runs ≥ 120 every season, 160) | cap seasons, median 160 / 66 | stems ≥ 7 cm/ha at 100 / 200 / 300 (160) | floor light at 100 / 200 / 300 | canopy beech at 100: n, mean H | stand H/D, beech 100 / 300 (core) | stand H/D, hornbeam 100 / 300 (core) | beech's share of canopy trees at 300 (160) |
|---|---|---|---|---|---|---|---|---|
| `head` | 109 / 76 (1) | 235 / 186.5 | 242 / 281 / 680 | 0.063 / 0.060 / 0.042 | 5, 23.7 m | 60 / 50 | 43 / 63 | 0.23 |
| `s3d` | 109 / 76 (2) | 79.5 / 11 | 234 / 164 / 812 | 0.057 / 0.062 / 0.042 | 6, 25.8 m | 56 / 50 | 40 / 69 | 0.16 |
| `B1` | 188 / 114 (5) | 238.5 / 200.5 | 188 / 688 / 930 | 0.056 / 0.062 / 0.056 | 37, 31.4 m | 54 / **79** | 43 / 33 | 0.89 |
| `B2` | 164 / 95 (2) | 230.5 / 224.5 | 164 / 891 / 1000 | 0.046 / 0.056 / 0.049 | 35, 31.8 m | 43 / **75** | 43 / 37 | 0.92 |
| `B1s3d` | 117 / 76 (1) | 86 / 11 | 203 / 258 / 1070 | 0.062 / 0.073 / 0.051 | 35, 31.7 m | 58 / **93** | 46 / 56 | 0.67 |
| `B2s3d` | 133 / 114 (0) | 52.5 / 23 | 172 / 500 / 1039 | 0.055 / 0.063 / 0.049 | 38, 32.4 m | 43 / **79** | 44 / 37 | 0.90 |

- **`stand.height100`:** the canopy beech at 100 average 31.4–32.4 m in every candidate arm. That is inside the source's 28.5–32.5 m and the fit's 24.0–37.0 m. HEAD's is 23.7 m, on 5 trees.
- **The stand H/D:**
  - Beech at 300 comes into `stand.slenderness`'s 70–94 in every candidate arm (75–93; HEAD 50).
  - Hornbeam's stand H/D falls to 33–37 (56 in `B1s3d`; HEAD 63), further below its band of 74–98. The hornbeam that remain are the stout planted veterans.
  - H over the 1.3 m DBH reads 0–8 above the core's (mostly ≤ 4; see `tables.md`).
- **Canopy trees/ha** rise with the stronger beech (164–188 against 109 without the stubs). Bar 8 (≥ 120/ha in every season from 100) still holds in at most 5 of 20 runs.
- **Stems ≥ 7 cm/ha** at 300 are 930–1,070 in the candidate arms, against HEAD's 680 and ADR 0068's 200–400. At 200 the candidates without stubs are already at 688–891.
- **Floor light** stays at 4.6–7.3% of open sky in every arm.
- **Cap seasons:**
  - The beech candidates without stubs hold HEAD's cap (231–239 desktop).
  - With the stubs, `B2s3d` is lower than `s3d` on the desktop (52.5 against 79.5). `B1s3d` is a little higher (86).
  - On the phone, `B1s3d` matches `s3d` at 11 and `B2s3d` is at 23.
- **Species shares:** see the table's last column and `tables.md`. On the phone (66 cells) beech holds 60–64% of the canopy at 300 in `B1`, `B2` and `B2s3d`, against HEAD's 14%. Drawn stems at 300 are 47–65% beech (desktop), against HEAD's 16%.

## 6. Recommendation

- **Adopt neither candidate on this evidence.**
  - `B2` (λ₀ alone) is the one arm whose beech meets Tallo at both seasons, and it brings the beech's stand height and H/D into their bands.
  - But it does this by turning the garden into a beech wood: about 90% of the canopy at 300, with hornbeam's canopy cut to a fifth.
  - The stubs probe's bar 4 (no hand-over) and the garden's hornbeam focus would not survive that. Stems ≥ 7 cm reach 2.5–5× ADR 0068's band.
- **The stubs do not rescue it.**
  - With `s3d`, `B2`'s beech fails at season 100.
  - `B1s3d` is the least disruptive arm: hornbeam stays readable and passing, and beech holds 67% of the canopy. But its beech fails at 100 (z 2.09).
- **What this says for #134:**
  - λ₀ is the beech's leader in the lone tree and also its competitive height in the stand. At 0.6708 beech overtops hornbeam everywhere.
  - A leader change that narrows the lone crown would need to leave the stand's height race alone. Two routes would do that, and both are new rules, so the choice is the user's:
    - gate it on the open-grown condition;
    - pair it with a beech-side cost.
  - The alternative is to accept a beech-dominated garden as the more realistic central European stand, and re-target hornbeam's role.
- **Gate (b)'s hornbeam failures are unreadability** (veterans beyond Tallo's 39 cm support), not hornbeam crowns outside the band. Their surviving crowns read 0.59–0.93× q50. A stricter re-read would lose only maple@300 for `B2`, which then passes the stand gate at least as well as HEAD on beech's own terms. The pre-registered verdict stands as written; this is noted for the user.

## Files

- `code/2026-11-16-beech-stand-check/run.ts`: the runs, the reuse links and the hash check.
- `code/2026-11-16-beech-stand-check/stand.py`: every table here.
- `code/2026-11-16-beech-stand-check/tables.md`, `reuse-check.txt`: its output in full, and the hash check.
- Runs (not committed): `runs/134-beech-stand/`.
