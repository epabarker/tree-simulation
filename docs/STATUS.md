# Status

_Last updated: 2026-11-02 evening (round 2: ADR 0044 adopted for beech at 20; ADR 0045 built, evidence against; blind test v3's judging set: the beech stand passes under the measured bark, the lone tree does not)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0029, 0031, 0032, 0039–0042 and 0044 accepted, 0030 and 0043 rejected, 0045 proposed (evidence against). The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0):** floor at 100 20 of 20; H/D at 300 19 of 20; crown base 20 of 20; plateau 17 of 20.
- **Renderer (I3 steps 1–2):** 64 depth slices from `zOrder`; phone (seed 10, 40 seasons): draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms.
- **Species harness (rounds 4–5):** closed stand (LAI, limb crown ratio, at 60 and 100); shade house 10 roofs; `lone100` (the reported shape at 100); `limbElevation` (form.rs); `m27_rescore.py`; line-up panels (`code/2026-10-31-species-round4/panel-*`, round `form`).
- **Round 5 (ADR 0029, accepted):** targets files hold `[form]` (the picks, dated 2026-10-31), `[[formRange]]`, `[[report]]` (shape, never scored); the fit is eight physiology knobs (T_rel fixed, ADR 0032). `fit_lm.py` logs the shape at every accepted step (`<sp>-steps.csv`) and flags a fit nearer a gallery reject than the hand form (`shapeFlag`); `m27_fit.py --pilot` stops after LM and draws the panel.
- **Form sweep and grids** (`code/2026-10-31-species-round5/form-{sweep,grid}.py`): one knob at a time, then the user's 4 × 4 × 3 grids and the posture sweep (birch, oak), seed 1; `figures/2026-10-31-form-{sweep,grid,posture}-<sp>-{60,100}.png`. `postureSetPoint` is the tenth form knob (ADR 0029, `[form]`).
- **Beech, fresh look (ADR 0039–0042, merged) + short-shoot lifespan 20 (ADR 0044, `claude/c1-calibration-ustbkz`):** relay gate, vigour fork and arm hold, vigour drop, light orthotropy, spurs end on wood over 20. 20 seeds: guard 11 of 20 (today 6), lone at 100 H 120, W/H 1.50, trunks clear. Blind test v3 (one scale): the lone beech is beech 17 of 18; the stand reads as birch (pale thin stems, crown ratio 0.30 against a sourced 0.47).
- **Gallery** (`analysis/fit/gallery/`): round 2's spindles (beech, birch), round 3's beech cone, oak and hornbeam parasols, round 4's birch pagoda; `m27_gallery.py`. Oak and hornbeam pass the check; beech's cone sits within the noise of its round-2 form (1.17 against 0.77).

## Next
1. **The user:** (a) beech's bark: measured mid grey (the stand reads beech, the lone tree oak) or pale (the reverse), blind test v3's judging set on `claude/foliage`; (b) ADR 0045's latch: not adopted on the evidence; keep or revert its column and checkpoint version 3; (c) merge `claude/c1-calibration-ustbkz` (ADR 0044 adopted, 0045 proposed) and `claude/foliage` (view options, off). Then the lone beech's rise-then-arch (a curve on the second level with a kept lift) and the stand's crown ratio (0.30 against 0.47): form, after shipping unless the user says otherwise.
2. **A new hornbeam pilot** on the re-picked form, under the stand-death penalty; accept by measured targets in band and stand alive ≥ 0.8 at 60 and 100. Then the overnight for the eight (`--out round5`), verification, panels, the gallery check at six seeds (`m27_gallery.py --seeds 6`).
3. **I3 steps 3–6** and C2's floor against LAI; then C3–C6 as hold-outs; release; the site's PR. R2's reiteration after shipping (ADR 0031).

## Open questions (user)
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf (parasol, mound, column): a C3/R3 question after shipping.
- **Birch's pick stops growing after 60** (H 113 → 112, stand crown ratio 0.17): the form or the fit?
- **The flat top** (ADR 0031, accepted): in growth, not pruning; the fix is R2's reiteration (Troll's model), after shipping.
- **Hornbeam pilot** (`fits/round5-pilot`): under the new stand-at-100 penalty it loses to its start (24.7 vs 8.3); a re-run of the pilot is next.

## Known issues
- **Memory, 160-cell plate + specimen** (ADR 0026's 256 MB): 312.5 MB before ADR 0032, 342.5 MB after, at 200 seasons. I3's open problem; the phone's 66-cell plate is 74.9 MB.
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH. **`npm run golden:update`** needs `npm run build:wasm` first.
- **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
