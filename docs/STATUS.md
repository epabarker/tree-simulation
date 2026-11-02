# Status

_Last updated: 2026-11-02 (I3 steps 3–6 on `claude/i3-remaining`: the snapshot's cost settled, the memory problem solved at 176 MB, reduced motion draws the plate at once, ADR 0046 accepted; the phone's captions at the soak)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0029, 0031, 0032, 0039–0042 and 0044 and 0046 accepted, 0030, 0043 and 0045 rejected. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0, re-run at shipping, 2026-11-02):** floor at 100 20 of 20; H/D at 300 20 of 20; crown base 20 of 20; plateau 19 of 20 (`2026-11-02-forest-evidence.md`).
- **Renderer (I3):** 64 depth slices from `zOrder`; the snapshot 8–11 ms at 160 cells (metrics 15–17% of it: no lean cadence); reduced motion draws the plate at once while `growStill` grows the intro (ADR 0046). Phone: "works great" (the user); its captions at the soak. Steps 1–2's phone: draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms.
- **Memory (ADR 0026, I3):** 176 MB with the specimen beside the 160-cell plate at 200 seasons, 62 MB on the phone's 66: the swap's `intoCheckpoint`, the lanes' accumulator sized once, the snapshot's buffer reused; every byte unchanged. `?bench` reports `memoryMB`.
- **Species harness (rounds 4–5):** closed stand (LAI, limb crown ratio, at 60 and 100); shade house 10 roofs; `lone100` (the reported shape at 100); `limbElevation` (form.rs); `m27_rescore.py`; line-up panels (`code/2026-10-31-species-round4/panel-*`, round `form`).
- **Round 5 (ADR 0029, accepted):** targets files hold `[form]` (the picks, dated 2026-10-31), `[[formRange]]`, `[[report]]` (shape, never scored); the fit is eight physiology knobs (T_rel fixed, ADR 0032). `fit_lm.py` logs the shape at every accepted step (`<sp>-steps.csv`) and flags a fit nearer a gallery reject than the hand form (`shapeFlag`); `m27_fit.py --pilot` stops after LM and draws the panel.
- **Beech, fresh look (ADR 0039–0042, merged) + short-shoot lifespan 20 (ADR 0044, `claude/c1-calibration-ustbkz`):** relay gate, vigour fork and arm hold, vigour drop, light orthotropy, spurs end on wood over 20. 20 seeds: guard 11 of 20 (today 6), lone at 100 H 120, W/H 1.50, trunks clear. Blind test v3 (one scale): the lone beech is beech 17 of 18; the stand reads as birch (pale thin stems, crown ratio 0.30 against a sourced 0.47).
- **Species forms after the judging pass (`hand-overrides.toml`, 2026-11-02):** birch's pendulous twigs; oak's posture by age and held apical control (dLambda 0.04, straight stems); maple's relay; holly's late fork (from 40); rowan's held limbs (λ 0.53, κ 1.0); willow's pick withdrawn (worse); hornbeam as fitted; beech the fresh look. The user's two passes: `reviews/2026-11-02-judging-pass.md`.
- **Gallery** (`analysis/fit/gallery/`): round 2's spindles (beech, birch), round 3's beech cone, oak and hornbeam parasols, round 4's birch pagoda; `m27_gallery.py`. Oak and hornbeam pass the check; beech's cone sits within the noise of its round-2 form (1.17 against 0.77).

## Next
1. **The user:** merge the I3 PR (`claude/i3-remaining` into `3d-port`).
2. **Ship (the user, 2026-11-02): no round-5 fit.** The species' looks are the form picks (ADR 0033–0038) and the beech; a species that reads wrong on the phone gets an override, never a round. I3 is done; next the release, the site's PR and the phone soak, which takes the phone's `?bench` captions and its reduced-motion wait (`garden.html?bench&seed=10`; over ≈ 3 s, ADR 0046's picture follows).
3. **After shipping, the form list:** the lone beech's rise-then-arch and the stand's crown ratio (0.30 against 0.47); the lone oak's arms (held, it is a cone); maple's flat top (ADR 0031); willow's dense bush; hornbeam's clear trunk; C2's floor against LAI; C3–C6 as hold-outs; R2's reiteration.

## Open questions (user)
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf (parasol, mound, column): a C3/R3 question after shipping.
- **Birch's pick stops growing after 60** (H 113 → 112, stand crown ratio 0.17): the form or the fit?
- **The flat top** (ADR 0031, accepted): in growth, not pruning; the fix is R2's reiteration (Troll's model), after shipping.

## Known issues
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH. **`npm run golden:update`** needs `npm run build:wasm` first.
- **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Where linear memory goes:** `code/2026-11-02-i3-remaining/memstats.sh` builds the core under a counting allocator; `memory-split.ts` splits a case by holder. A buffer grown by doubling keeps its peak: size growing buffers once.
