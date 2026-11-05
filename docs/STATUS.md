# Status

_Last updated: 2026-11-05 (the overseer's review: [plan](plans/2026-11-05-overseer.md). Read it before anything else.)_

**Live:** the 3D garden, **garden 0.15.0**, has been on edbarker.dev since 2026-11-02. It was released from `3d-port` (a417437), the site's PR #7. The done-means bar below was met and shipped. The hour-long phone soak is still to do. Work branches open PRs into `3d-port`. `claude/reference-fidelity` (60 commits, including ADR 0054's lean fix) is not merged yet.

**Done means** (the user, met 2026-11-02): the mixed wood looks right in the garden in depth, within the phone's budget, with floor, H/D and crown base as 20-seed evidence.

**Direction (the user, 2026-11-05): trees should look like their species; variation between trees can wait.** The overseer's plan has two tracks:
- **G, the garden:** stop the plate drawing wrapped copies; fit the plate to its width without cropping crowns; ADR 0054; release 0.16.0.
- **F, the look:** one good generic broadleaf first, then the species as departures from it. Agents judge, using a "which is real?" test calibrated on real QSMs, never the user's eye. The umbrella crowns are ADR 0031's flat cap. Lone trees are compared as well as the stand (TreeML).
- **Exit:** 3 sessions and 1 overnight fit, from 2026-11-05, to an adopted look or a recorded pause.
- **Rule:** no new descriptor, registration, ADR or audit without the overseer's OK.
- Reference fidelity's detail (gate c v3.2, Level 0 v2, pilots v1–v4, ADR 0050–0054) lives in [its plan's State](plans/2026-11-03-reference-fidelity.md#state). ADR 0053 (individual variation) is deferred by the user.

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
1. The overseer's plan, tracks G and F ([plan](plans/2026-11-05-overseer.md) §5).
2. After that, the form list: lone beech's rise-then-arch, oak's arms, maple's flat top (ADR 0031), willow's bush, hornbeam's clear trunk; C3–C6 as hold-outs.

## Open questions (user)
**`levels.2.setPoint` ≥ 80** collapses every broadleaf (C3/R3, after shipping). **Birch's pick stops growing after 60**: form or fit?

## Known issues
- **The slab damps depth leans** in the stand's face rows (ADR 0054's note). This bears on front-view reads (Level 0's lone width).
- **The plate draws wrapped copies** of the ring on wide screens once crowns grow tall (`scene.ts:667`; the overseer's plan, track G).
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone. **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH (the hook does). **`npm run golden:update`** needs `npm run build:wasm` first. **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`. **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Reference data:** `data/reference/` is git-ignored (re-fetch by the URLs in each audit file); `count_species.py` recounts. Memory: `code/2026-11-02-i3-remaining/memstats.sh`.
