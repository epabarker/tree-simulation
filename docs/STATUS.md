# Status

_Last updated: 2026-10-31 (round 5: R4 counts dormant seasons (goldens updated); ADR 0030 rejected; hornbeam pilot not accepted (lateShare), its stand's middle row dies by 100; the cap survives the fit and k_shed 3)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0028 accepted, 0029 proposed. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0):** floor at 100 20 of 20; H/D at 300 19 of 20; crown base 20 of 20; plateau 17 of 20.
- **Renderer (I3 steps 1–2):** 64 depth slices from `zOrder`; phone (seed 10, 40 seasons): draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms.
- **Species harness (rounds 4–5):** closed stand (LAI, limb crown ratio, at 60 and 100); shade house 10 roofs; `lone100` (the reported shape at 100); `limbElevation` (form.rs); `m27_rescore.py`; line-up panels (`code/2026-10-31-species-round4/panel-*`, round `form`).
- **Round 5 (ADR 0029, proposed):** targets files hold `[form]` (round 2's values as placeholders), `[[formRange]]`, `[[report]]` (shape, never scored); the fit is nine physiology knobs. `fit_lm.py` logs the shape at every accepted step (`<sp>-steps.csv`) and flags a fit nearer a gallery reject than the hand form (`shapeFlag`); `m27_fit.py --pilot` stops after LM and draws the panel.
- **Form sweep and grids** (`code/2026-10-31-species-round5/form-{sweep,grid}.py`): one knob at a time, then the user's 4 × 4 × 3 grids and the posture sweep (birch, oak), seed 1; `figures/2026-10-31-form-{sweep,grid,posture}-<sp>-{60,100}.png`. `postureSetPoint` is the tenth form knob (ADR 0029, `[form]`).
- **Gallery** (`analysis/fit/gallery/`): round 2's spindles (beech, birch), round 3's beech cone, oak and hornbeam parasols, round 4's birch pagoda; `m27_gallery.py`. Oak and hornbeam pass the check; beech's cone sits within the noise of its round-2 form (1.17 against 0.77).

## Next
1. **The user:** judge the lab panel (round `form`, `figures/2026-10-31-panel-form-*`) and the picks (`[form]`, dated; hornbeam, oak provisional; beech, maple flagged).
2. **The gallery check** on six seeds passes for the picks. Only then the pilot (beech, `m27_fit.py … --pilot`), the eight overnight, the hold-out, adoption (its own ADR).
3. **The shedding question** (below) before or after the pilot: the user's call.
4. **I3 steps 3–6** and C2's floor against LAI, as before; then C3–C6 as hold-outs; release; the site's PR.

## Open questions (user)
- **ADR 0029** to accept. ADR 0030 rejected.
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf (parasol, mound, column): a C3/R3 question after shipping.
- **Birch's pick stops growing after 60** (H 113 → 112, stand crown ratio 0.17): the form or the fit?
- **The cap is both shedding rules** (P < M and T_rel·Q_top): `r1.kShed` 3 (proposed, default 1) hands the twigs to T_rel; plateau holds, forest keeps its wood. Next: relax both, or refit T_rel with k_shed?
- **Hornbeam pilot** (`fits/round5-pilot`): 5 of 6 measured in band (lateShare out); the stand's middle row is dead at 100, unseen by a loss scored at 60.
- **`limbElevation` reads back the set point** for most species (oak 31° = 90 − 58.6 in every row but setPoint's): little information beyond the knob itself.
- At 100 most beech sweep cells reach the woods' top (200): the flat tops there are the ceiling.

## Known issues
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH. **`npm run golden:update`** needs `npm run build:wasm` first.
- **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
