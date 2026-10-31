# Status

_Last updated: 2026-10-31 (species round 5 built: the form sweep, the gallery, the driver; ADR 0029 proposed. Every pick and run waits on the user's reading of the sweep)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0028 accepted, 0029 proposed. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0):** floor at 100 20 of 20; H/D at 300 19 of 20; crown base 20 of 20; plateau 17 of 20.
- **Renderer (I3 steps 1–2):** 64 depth slices from `zOrder`; phone (seed 10, 40 seasons): draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms.
- **Species harness (rounds 4–5):** closed stand (LAI, limb crown ratio, at 60 and 100); shade house 10 roofs; `lone100` (the reported shape at 100); `limbElevation` (form.rs); `m27_rescore.py`; line-up panels (`code/2026-10-31-species-round4/panel-*`, round `form`).
- **Round 5 (ADR 0029, proposed):** targets files hold `[form]` (round 2's values as placeholders), `[[formRange]]`, `[[report]]` (shape, never scored); the fit is nine physiology knobs. `fit_lm.py` logs the shape at every accepted step (`<sp>-steps.csv`) and flags a fit nearer a gallery reject than the hand form (`shapeFlag`); `m27_fit.py --pilot` stops after LM and draws the panel.
- **Form sweep** (`code/2026-10-31-species-round5/form-sweep.py`): nine knobs × four values per species, seed 1, natively; `figures/2026-10-31-form-sweep-<sp>-{60,100}.png` for all eight.
- **Gallery** (`analysis/fit/gallery/`): round 2's spindles (beech, birch), round 3's beech cone, oak and hornbeam parasols, round 4's birch pagoda; `m27_gallery.py`. Oak and hornbeam pass the check; beech's cone sits within the noise of its round-2 form (1.17 against 0.77).

## Next
1. **The user:** read the sweep sheets; name the knobs per species for the three-knob grid (§3.2).
2. **The grids**, then the `[form]` picks (dated comments) and the lab panel's round `form` (`m27_gallery.py --form-patches runs/form`).
3. **The gallery check** passes for every species (`m27_gallery.py`): beech's and birch's hand forms are round 2's today, so they coincide with their spindle entries.
4. **Pilot:** beech, `m27_fit.py --method lm --start round2 --species beech --out round5-pilot --pilot` (≈ 25 min), its panel; the user judges. Then the eight overnight, the hold-out, adoption (its own ADR).
5. **I3 steps 3–6** and C2's floor against LAI, as before; then C3–C6 as hold-outs; release; the site's PR.

## Open questions (user)
- **ADR 0029** to accept.
- **Birch's limbs ignore the set point:** its level 1 has `postureSetPoint` 70 (R3's posture), so `limbElevation` stays ≈ 21° across `setPoint` 20–90. A tenth form knob for birch? (Beech and hornbeam set it to 0 at level 0 only.)
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
