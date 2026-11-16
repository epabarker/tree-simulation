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

_Not yet run._

## Files

- `code/2026-11-16-beech-stand-check/run.ts`: the runs, the reuse links and the hash check.
- `code/2026-11-16-beech-stand-check/stand.py`: every table here.
- Runs (not committed): `runs/134-beech-stand/`.
