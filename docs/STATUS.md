# Status

_Last updated: 2026-11-06, the overnight run ([note](experiments/2026-11-06-overnight-generic-broadleaf.md), [plan and State](plans/2026-11-06-overnight.md), ADR 0055 proposed)._

**Live:** garden 0.15.0 (the 3D garden) since 2026-11-02. **Waiting on the user:**
- **draft PR #48:** 0.16.0, one lap of the plate plus ADR 0054's lean fix;
- **draft PR #49**, stacked on it: the release candidate.
  - Within-tree irregularity for the 8 broadleaves (ADR 0055).
  - Natural heights, in a separate, revertible commit.
  - `PLATE_MAX` 170.
  - Preview: https://preview-3d-edbarker-dev.edbarker.workers.dev/

Nothing is merged or tagged; tag pushes are the user's.

**Done means** (the user, met 2026-11-02): the mixed wood looks right in the garden in depth, within the phone's budget, with floor, H/D and crown base as 20-seed evidence.

**Direction (the user, 2026-11-05): trees look like trees and like their species**, species chosen by data (beech, sycamore, oak first; then ash, hornbeam). Variation between trees (ADR 0053) can wait.
- **Instrument:** six within-tree descriptors on coarsened sims and real QSMs, with a scan-noise floor from
  BioDiv's repeats. Four are usable: spacingCV, attachPerM, insertSD, elevSD.
- **The judge:** the "which is real?" judge saturates. The sim-vs-sim judge failed its gate on the user's picks
  (69% against 75%).
- **The garden's evidence:** `forestParams(160)`, 20 seeds, via the overnight scripts.
- **Rule:** no new descriptor, registration, ADR or audit without a reason the user can see in the garden.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0, re-run at shipping, 2026-11-02):** floor at 100 20 of 20; H/D at 300 20 of 20; crown base 20 of 20; plateau 19 of 20 (`2026-11-02-forest-evidence.md`).
- **Renderer and memory (I3, merged):** 64 depth slices from `zOrder`; snapshot 8–11 ms at 160 cells; reduced motion draws the plate at once (ADR 0046); 176 MB with the specimen beside the 160-cell plate at 200 seasons, 62 MB on the phone's 66; `?bench` reports `memoryMB`. Phone: "works great" (the user); its captions at the soak.
- **Species harness (rounds 4–5, ADR 0029, 0032):** closed stand, shade house, `lone100`, `limbElevation`, `m27_rescore.py`, line-up panels; targets files hold `[form]`, `[[formRange]]`, `[[report]]`; `fit_lm.py` logs the shape at every accepted step and flags fits nearer a gallery reject (`shapeFlag`).
- **Beech, fresh look (ADR 0039–0042, 0044):** relay gate, vigour fork and arm hold, vigour drop, light orthotropy, spurs end on wood over 20. 20 seeds: guard 11 of 20, lone at 100 H 120, W/H 1.50. Blind test v3: the lone beech is beech 17 of 18; the stand reads as birch (crown ratio 0.30 against 0.47).
- **Species forms after the judging pass (`hand-overrides.toml`, 2026-11-02):** birch's pendulous twigs; oak's posture by age and held apical control; maple's relay; holly's late fork; rowan's held limbs; willow's pick withdrawn; hornbeam as fitted; beech the fresh look. The user's two passes: `reviews/2026-11-02-judging-pass.md`.
- **Gallery** (`analysis/fit/gallery/`): rounds 2–4's rejects; `m27_gallery.py`. Oak, hornbeam pass; beech's cone within noise. **Reference:** `analysis/treesim/` (readers, `describe()`, `coarsen()`, tolerances), 59 Python tests.

## Harness (ADR 0047, runs 1–2b, 2026-11-02; principles: docs/background/harness-principles.md)
- **Gate:** Stop hook → `.claude/hooks/check-stamped.sh` (one lock, one stamp, shared fingerprint in `check-lib.sh`). Run `npm run check:stamp` in the foreground, never in the background: a manual green counts, a concurrent run is waited for and reused. Unchanged tree: hook in 13 ms. Let-through only after the hook has blocked once on the same red (`red-shown`). Check 3 m 28 s warm; two tests carry 90 s timeouts.
- **Agents:** `Explore` and `doc-lookup` (Haiku: finding), `spec-reviewer` (Fable; `reviewer-bash-guard.sh` blocked `touch` under auto mode, 2026-11-02), `experiment-worker`. `rg` dropped from the guard's allow-list (`rg --pre` runs commands); hook timeout 1200 s (600 s lock wait + a cold suite).
- **Still to measure (§5):** 3b's hit rate; 3c's token delta; the 3g A/B; a Stop hook's `systemMessage` over Remote Control (asked).

## Next
1. **The user:** merge #48, then #49 (or #49 alone), then tag. Phone soak. Rule on ADR 0055 and on the height commit.
2. **The flat cap:** λ's fall by level, with twigs keeping λ (ADR 0055, "Not decided here"). Oak's stand branch density.
3. **Species by data:** sycamore and ash enter the garden (Wytham, TreeML), then lime and Norway maple (lone only).

## Open questions (user)
**`levels.2.setPoint` ≥ 80** collapses every broadleaf (C3/R3, after shipping). **Birch's pick stops growing after 60**: form or fit?

## Known issues
- **The slab damps depth leans** in the stand's face rows (ADR 0054's note). This bears on front-view reads (Level 0's lone width).
- **Phone, seed 3:** nearly empty by season 150, in 0.16.0 and the RC alike.
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone. **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH (the hook does). **`npm run golden:update`** needs `npm run build:wasm` first. **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`. **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Reference data:** `data/reference/` is git-ignored (re-fetch by the URLs in each audit file); `count_species.py` recounts. Memory: `code/2026-11-02-i3-remaining/memstats.sh`.
