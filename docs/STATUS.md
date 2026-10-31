# Status

_Last updated: 2026-10-31 (species round 4: harness, targets and ADR 0028 done; the hold-out and the re-fit are the user's)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0028 accepted. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0):** floor at 100 20 of 20; H/D at 300 19 of 20; crown base 20 of 20; plateau 17 of 20.
- **Renderer (I3 steps 1–2):** 64 depth slices from `zOrder`; per-snapshot work −55–60%. Phone (seed 10, 40 seasons): draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms.
- **Species harness (round 4, ADR 0028):** closed stand (3 × 4, τ 0) reports `lai` and the limb crown ratio (cumulative from below, 5% of leaf); `lone.profile` (10 bands) is a trait kind; shade house 10 roofs (30–1.8%); survival light credits seasons past the 4-season starvation timer; `m27_rescore.py`; line-up panels (`code/2026-10-31-species-round4/panel-*`).
- **Targets (round 4):** per-species stand H/D (birch 95, oak 75, beech 82, hornbeam 86, maple 68); lone spread at the trial's age (beech 0.6, oak 0.75); LAI measured for birch, oak, hornbeam, beech; η ≤ 1.0 for broadleaves. Rowan and holly have no measured target: the panel decides them.
- **Round 3 re-scored** against them ([note](experiments/2026-10-30-species-3d.md), "Round 4"); beech's acceptance withdrawn. Round 3 fits: `fits/round3/`; round 2 (2D): `fits/round2/`.

## Next
1. **Step A (the user, now):** the hold-out on round 3 without the floors (`m27_holdout.py --round round3 --skip floor`). Stop rule: oak, hornbeam or beech ≥ 190 in the mixed wood → R1's discount (ADR 0021) first.
2. **Step E (the user, overnight):** round 4 (`m27_fit.py --method lm --start round2 --species garden --out round4`), then panels and the hold-out on round 4; adoption is its own ADR.
3. **I3 steps 3–6:** `tree_metrics` profile; foliage coverage and leaf opacity on the phone (a dev `?intro=`); `growStill` on the phone; first paint (an ADR, the next free number); a Canvas 2D `?bench`.
4. **After round 4, for C2:** the closed stand's floor against its LAI across species (the model's effective k ≈ 0.35 against K_PAR 0.37–0.51). The own-wood floors of beech, hornbeam and holly will still fail: expected, not grounds to reject.
5. **Then:** C3–C6 as hold-outs; release; the site's PR.

## Open questions (user)
- **The panels:** judge beech, oak and hornbeam on `figures/2026-10-31-species-panel-*.png` (round 2 beside round 3). Round 3's oak, hornbeam and maple crowns are widest near the top (vases); beech, birch, rowan and holly at the base.
- **Beech's stand crown** is short in the model (limb crown ratio 0.27–0.40 against 0.57): the low limbs are gone, not a definition problem.
- Two trees very close together at spacing 21 (a recruit beside a planted trunk): watch for it at 28.

## Known issues
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH (`npm run bench`, the hold-out's native runs). **`npm run golden:update`** needs `npm run build:wasm` first.
- **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`: CI has no Python).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`; ≈ 1–4 min a shot (slower under a fit). Species trees ignore world patches: use `--species-patch`. A `forest` run writes ≈ 175 MB.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
