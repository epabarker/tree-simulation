# Status

_Last updated: 2026-10-30 (form steps 3–5 merged, 20-seed evidence; the I3 plan written and decided)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0027 accepted. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2.
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0, 300 seasons):**
  - floor at 100 in 2–10%: 20 of 20 (median 7.9%);
  - stand H/D at 300 in 60–80: 19 of 20 (median 70.6);
  - crown base (stand `leafCrownRatio` below the lone tree's at 150 and 300): 20 of 20;
  - plateau (the same trees' gain over 250–300 < 2, tallest < 180): 17 of 20.
- **Garden** (`mountGarden`) runs the 3D core through the 2D renderer, growing from seed.
- **Headless:** `npm run sim` (`--light` writes `light.csv` with `lad`, `ground.csv`, `buds.csv`), `npm run bench`; round 3's harness in `docs/experiments/code/2026-10-30-form/`.

## Next
1. **I3** ([plan](plans/2026-10-30-i3.md), decided; steps 1–2 first): wood and leaves in z-slices, the z order from Rust; plate cap 160; recruits per area; the live intro, a picture only for reduced motion (a 3D checkpoint is 4–14 MB); the frame under the 200 top; re-time the phone.
2. **τ** (user): 0.2 stays until I3 step 4, when 0.1 and 0.2 are seen side by side in depth. Floor at 100/150/300: τ 0 7.7/9.9/12.2%, τ 0.1 11.6/13.9/14.8%, τ 0.2 14.5/15.8/14.8%; seedlings to 20 cells by 300: 1, 79, 127.
3. **Species** ([plan](plans/2026-10-30-species.md), decided): a least-squares re-fit from the round-2 fits (a 3D candidate-seed costs 30–55 s, 20–33× 2D's; LM ≈ 3 h for the garden's eight on 12 cores); r0 with m_w derived; floor to the hold-out in own woods at τ 0; first `m27_adopt.py` reproduces `flora-fitted.ts`; pilot beech on the VM.
4. **Then:** C3–C6 as hold-outs. C5 owns regeneration under the canopy (a floor that holds to 300) and storm severity (the worst storms take 10–40%). ADRs (first paint, R5's default); release; the site's PR.

## Known issues
- **Regeneration:** `forest` (a light-demanding monoculture) cannot regenerate under its own floor at τ 0. Its floor rises from 7.9% at 100 to 10.4% at 150 and 9.7–15.8% at 300 as the stand ages.
- **τ 0.2 (the garden's look):** floor ≈ 15% at every season; the faces add 3–7 points.
- **`flora-fitted.ts` ≠ `m27_adopt.py`'s output** (`flora.ts`'s `in3d` overlay applies phyllotaxis and E at runtime); r0, m_w and σ_break were hand-edited.
- **The garden's frame** fits half the 200 top (`WORLD_HEIGHT` 130 is stale): young gardens draw small.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH; wasm-bindgen-cli 0.2.129. **Node** 24 here.
- **`npm run golden:update` uses the built WASM:** run `npm run build:wasm` first.
- **Species trees ignore world patches:** use `--species-patch`. `forest` plants no species.
- **A `forest` run writes ≈ 175 MB** (`metrics.csv` has every seedling). Bash reserves `GROUPS`: the readers take `RUN_GROUPS`.
- **Full check under 12 parallel runs** times out three vitest files; rerun when idle.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Evidence tests** fail a world past 1.5M metamers (`METAMER_CAP`); free each world in loops.
- **Laptop:** its local `claude/gallant-brown-5k4g33` has four unpushed 2D commits (ADR number clash "0024"). Left alone.
