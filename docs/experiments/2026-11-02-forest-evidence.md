# `forest`, the 20-seed evidence at shipping (2026-11-02)

The tracks plan's §3 asked for the `forest` evidence to be re-run once at the end, under the R4 fix and ADR 0032, as the stand's record for the release. This is that run, at `3d-port` 310d2f8 (ADR 0039–0044 for beech, which `forest`'s generic trees do not use; the gate's rise). The script, criteria and pass rule are form step 5's ([2026-10-30-c1-round3-form.md](2026-10-30-c1-round3-form.md) §5; `code/2026-10-30-form/evidence.sh`, `evidence.py`, `plateau.py`): `forest` seeds 1–20 at τ 0 and τ 0.2, 300 seasons, each measure read at its own season, pass at ≥ 15 of 20. Outputs: [`code/2026-11-02-forest-evidence/evidence.txt`](code/2026-11-02-forest-evidence/evidence.txt), [`plateau.txt`](code/2026-11-02-forest-evidence/plateau.txt). Runs: `runs/evidence` (not committed).

| τ 0, seeds 1–20 | 2026-10-30 (ADR 0027) | 2026-11-02 (this run) |
|---|---|---|
| floor at 100 in 2–10% | 20 of 20 (median 7.9%) | **20 of 20** (median 7.0%, range 4.8–8.1%) |
| stand H/D at 300 in 60–80 | 19 of 20 (median 70.6) | **20 of 20** (median 70.7, range 61–77) |
| crown base: the stand's leaf crown ratio below its lone tree's, at 150 and 300 | 20 of 20 | **20 of 20** |
| plateau: the same trees' median gain over 250–300 < 2 cells, tallest < 180 | 17 of 20 | **19 of 20** |
| beside: floor at 150 in 2–10% | 8 of 20 (median 10.4%) | 19 of 20 (median 8.4%) |
| beside: trees released ≥ 10 cells over 250–300, all seeds | 13 | 5 |

| τ 0.2 (the garden's look), reported beside | 2026-10-30 | 2026-11-02 |
|---|---|---|
| floor at 100 | 0 of 20 (median 14.6%) | 0 of 20 (median 13.1%) |
| H/D at 300 | 18 of 20 (71.2) | 19 of 20 (69.7) |
| crown base | 20 of 20 | 20 of 20 |
| plateau | 16 of 20 | 16 of 20 |

- **Every criterion holds, and the two that were nearest the line have moved away from it:** the plateau from 17 to 19 of 20, and the floor at 150 from 8 to 19 of 20 in band. Fewer trees are released beside gaps over 250–300 (5 against 13). This is the R4 fix and ADR 0032's acclimated leaf cost, which settled the stand; `forest`'s trees carry no species patch, so the beech work does not touch it.
- **τ 0.2's floor stays out of the band by construction:** the band was set for τ 0 (step 5), and τ 0.2's faces let the sides light the floor. It is the garden's look, not its criterion.
- **The stand's record for the release is this run.** Nothing in the shipping list depends on a further `forest` run.
