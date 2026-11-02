# Status

_Last updated: 2026-11-02 (round 2 merged: PRs #41–#43; the beech passes the user's eye on the phone; `forest` evidence re-run at shipping, all criteria hold; shipping order set, no round-5 fit)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0029, 0031, 0032, 0039–0042 and 0044 accepted, 0030, 0043 and 0045 rejected. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0, re-run at shipping, 2026-11-02):** floor at 100 20 of 20; H/D at 300 20 of 20; crown base 20 of 20; plateau 19 of 20 (`2026-11-02-forest-evidence.md`).
- **Renderer (I3 steps 1–2):** 64 depth slices from `zOrder`; phone (seed 10, 40 seasons): draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms.
- **Species harness (rounds 4–5):** closed stand (LAI, limb crown ratio, at 60 and 100); shade house 10 roofs; `lone100` (the reported shape at 100); `limbElevation` (form.rs); `m27_rescore.py`; line-up panels (`code/2026-10-31-species-round4/panel-*`, round `form`).
- **Round 5 (ADR 0029, accepted):** targets files hold `[form]` (the picks, dated 2026-10-31), `[[formRange]]`, `[[report]]` (shape, never scored); the fit is eight physiology knobs (T_rel fixed, ADR 0032). `fit_lm.py` logs the shape at every accepted step (`<sp>-steps.csv`) and flags a fit nearer a gallery reject than the hand form (`shapeFlag`); `m27_fit.py --pilot` stops after LM and draws the panel.
- **Beech, fresh look (ADR 0039–0042, merged) + short-shoot lifespan 20 (ADR 0044, `claude/c1-calibration-ustbkz`):** relay gate, vigour fork and arm hold, vigour drop, light orthotropy, spurs end on wood over 20. 20 seeds: guard 11 of 20 (today 6), lone at 100 H 120, W/H 1.50, trunks clear. Blind test v3 (one scale): the lone beech is beech 17 of 18; the stand reads as birch (pale thin stems, crown ratio 0.30 against a sourced 0.47).
- **Species forms (track B's picks, adopted 2026-11-02):** birch's pendulous twigs, oak's posture by age, maple's relay, willow's pendulous twigs (`hand-overrides.toml`); hornbeam, rowan, holly today's form; beech the fresh look. The user's judging pass: `reviews/2026-11-02-judging-pass.md` (oak "no", seven "nearly").
- **Gallery** (`analysis/fit/gallery/`): round 2's spindles (beech, birch), round 3's beech cone, oak and hornbeam parasols, round 4's birch pagoda; `m27_gallery.py`. Oak and hornbeam pass the check; beech's cone sits within the noise of its round-2 form (1.17 against 0.77).

## Next
1. **The user:** merge `claude/c1-calibration-ustbkz` (ADR 0044 adopted; ADR 0045 rejected and reverted) and `claude/foliage` (beech's measured bark as default, the user's choice; clearBole, frame=height as options). Then the lone beech's rise-then-arch (a curve on the second level with a kept lift) and the stand's crown ratio (0.30 against 0.47): form, after shipping unless the user says otherwise.
2. **Ship (the user, 2026-11-02): no round-5 fit.** The species' looks are the form picks (ADR 0033–0038) and the beech; a species that reads wrong on the phone gets an override, never a round. One judging pass over the mixed wood and each lone tree on the phone; then I3 steps 3–6 on a fresh track C session (the snapshot's metrics cost, reduced motion, first paint, the 160-cell plate's memory); then the release, the site's PR and the phone soak.
3. **After shipping:** the lone beech's rise-then-arch (a kept lift with a curve on the second level), the stand's crown ratio (0.30 against a sourced 0.47), the lone oak's vase; C2's floor against LAI; C3–C6 as hold-outs; R2's reiteration (ADR 0031).

## Open questions (user)
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf (parasol, mound, column): a C3/R3 question after shipping.
- **Birch's pick stops growing after 60** (H 113 → 112, stand crown ratio 0.17): the form or the fit?
- **The flat top** (ADR 0031, accepted): in growth, not pruning; the fix is R2's reiteration (Troll's model), after shipping.

## Known issues
- **Memory, 160-cell plate + specimen** (ADR 0026's 256 MB): 312.5 MB before ADR 0032, 342.5 MB after, at 200 seasons. I3's open problem; the phone's 66-cell plate is 74.9 MB.
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH. **`npm run golden:update`** needs `npm run build:wasm` first.
- **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
