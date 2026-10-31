# Status

_Last updated: 2026-10-31 (round 5: the dome sweep rounds no top, beech stops on form; birch is not starving; hornbeam's provisional pick holds its kind on seeds 1–3. Other picks wait on the user)_

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
1. **The user:** picks for birch, willow, rowan, holly, oak and maple (`form-picks.py`'s `PICKS`). Hornbeam's provisional pick (aC 15, dΛ 0.08, λ0 0.56) holds its kind on seeds 1–3; beech stays at round 2's, flagged.
2. **The picks:** `form-picks.py` at seeds 1–3; the lab panel, round `form`, lone at 60 and 100 and the stand at 100; then `[form]` with dated comments naming the cell.
3. **The gallery check** on six seeds passes for the picks and the user judges the panel. Only then the pilot (beech, `m27_fit.py … --pilot`), the eight overnight, the hold-out, adoption (its own ADR).
4. **I3 steps 3–6** and C2's floor against LAI, as before; then C3–C6 as hold-outs; release; the site's PR.

## Open questions (user)
- **ADR 0029** to accept.
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf (parasol, mound, column): a C3/R3 question after shipping.
- **Flat caps and no dome** (beech, hornbeam, oak, maple): no form knob nor ramp, pTerm, generator or twig set point rounds a top. A core question; `r2.ramp` is live as a proportion knob (user's call to add it).
- **Birch's unspent reserve:** ≈ 5200 held while the crown shrinks from 60 to 100 (not starving); why it is not spent is open.
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
