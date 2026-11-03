# Status

_Last updated: 2026-11-03 (reference fidelity, phase 1 done on `claude/reference-fidelity`: gates a–c; before that the harness, ADR 0047, 2026-11-02)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0029, 0031, 0032, 0039–0042, 0044, 0046 and 0047 accepted, 0030, 0043 and 0045 rejected. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

**Direction (the user, 2026-11-03):** species fidelity from measured reference data on three levels (ADR 0049, accepted;
the [plan](plans/2026-11-03-reference-fidelity.md); §g: beech is phase 3, oak phase 4). Phase 1 is done
([note](experiments/2026-11-03-phase1-converter.md)): gates a and b pass. Gate c stops oak (5 of 22 descriptors
survive) and beech (1 of 26); maple passes (12 of 22) only if H1 is extended to it,
and stops otherwise (12 of 26). The control shows d_min (the median terminal diameter) is not neutral
on the datasets' own QSMs.
- **Waiting on the user:** the note's five decisions (d_min after the control, H1 for maple, beech's noise floor,
  `--gate-c`, size matching). Phase 2 (Tallo, Level 0) does not depend on them.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0, re-run at shipping, 2026-11-02):** floor at 100 20 of 20; H/D at 300 20 of 20; crown base 20 of 20; plateau 19 of 20 (`2026-11-02-forest-evidence.md`).
- **Renderer and memory (I3, merged):** 64 depth slices from `zOrder`; snapshot 8–11 ms at 160 cells; reduced motion draws the plate at once (ADR 0046); 176 MB with the specimen beside the 160-cell plate at 200 seasons, 62 MB on the phone's 66; `?bench` reports `memoryMB`. Phone: "works great" (the user); its captions at the soak.
- **Species harness (rounds 4–5, ADR 0029, 0032):** closed stand, shade house, `lone100`, `limbElevation`, `m27_rescore.py`, line-up panels; targets files hold `[form]`, `[[formRange]]`, `[[report]]`; `fit_lm.py` logs the shape at every accepted step and flags fits nearer a gallery reject (`shapeFlag`).
- **Beech, fresh look (ADR 0039–0042, 0044):** relay gate, vigour fork and arm hold, vigour drop, light orthotropy, spurs end on wood over 20. 20 seeds: guard 11 of 20, lone at 100 H 120, W/H 1.50. Blind test v3: the lone beech is beech 17 of 18; the stand reads as birch (crown ratio 0.30 against 0.47).
- **Species forms after the judging pass (`hand-overrides.toml`, 2026-11-02):** birch's pendulous twigs; oak's posture by age and held apical control; maple's relay; holly's late fork; rowan's held limbs; willow's pick withdrawn; hornbeam as fitted; beech the fresh look. The user's two passes: `reviews/2026-11-02-judging-pass.md`.
- **Gallery** (`analysis/fit/gallery/`): rounds 2–4's rejects; `m27_gallery.py`. Oak and hornbeam pass the check; beech's cone sits within the noise of its round-2 form.

## Harness (ADR 0047, runs 1–2b, 2026-11-02; principles: docs/background/harness-principles.md)
- **Gate:** Stop hook → `.claude/hooks/check-stamped.sh` (one lock, one stamp, shared fingerprint in `check-lib.sh`). Run `npm run check:stamp` in the foreground, never in the background: a manual green counts, a concurrent run is waited for and reused. Unchanged tree: hook in 13 ms. Let-through only after the hook has blocked once on the same red (`red-shown`). Check 3 m 28 s warm; two tests carry 90 s timeouts.
- **Agents:** `Explore` and `doc-lookup` (Haiku: finding), `spec-reviewer` (Fable; `reviewer-bash-guard.sh` blocked `touch` under auto mode, 2026-11-02), `experiment-worker`. `rg` dropped from the guard's allow-list (`rg --pre` runs commands); hook timeout 1200 s (600 s lock wait + a cold suite).
- **Still to measure (harness doc §5):** 3b's hit rate; 3c's token delta; the 3g A/B. Whether a Stop hook's `systemMessage` shows over Remote Control: asked of the user.

## Next
1. **Ship (the user, 2026-11-02; now decision 1 of the reference plan): no round-5 fit.** The species' looks are the form picks (ADR 0033–0038) and the beech; a species that reads wrong on the phone gets an override, never a round. Next the release, the site's PR and the phone soak (`garden.html?bench&seed=10`; over ≈ 3 s, ADR 0046's picture follows).
2. **After shipping, the form list:** the lone beech's rise-then-arch and the stand's crown ratio; the lone oak's arms; maple's flat top (ADR 0031, R2's reiteration); willow's dense bush; hornbeam's clear trunk; C2's floor against LAI; C3–C6 as hold-outs.

## Open questions (user)
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf: a C3/R3 question after shipping. **Birch's pick stops growing after 60** (H 113 → 112): the form or the fit?

## Known issues
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone. **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH (the hook does). **`npm run golden:update`** needs `npm run build:wasm` first. **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`. **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Reference data:** `data/reference/` is git-ignored (re-fetch by the URLs in each audit file); `count_species.py` recounts. Memory: `code/2026-11-02-i3-remaining/memstats.sh`.
