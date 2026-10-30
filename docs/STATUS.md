# Status

_Last updated: 2026-10-30 (C1 round 3: form steps 1–2, girth in 3D and the crown base by leaf area)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0027 accepted. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2.
- **Girth (ADR 0027):**
  - scars record the pipe radius; r0 0.0025 and m_w 64 (÷ 8, × 64); σ_break 7000; windthrow's ramp from H/D 80;
  - `forest` at 300 (3 seeds): H/D 70, height level at 77, 68k metamers per seed, windthrow 0–2 of 90;
  - its lone tree: H/D 40–42, level at 87–89.
- **Crown base by leaf area:** `leafBase`, `leafCrownRatio` (metrics 37 → 39): stand 0.44–0.64, lone tree 0.71–0.81.
- **Garden** (`mountGarden`) runs the 3D core through the 2D renderer, growing from seed.
- **Headless:** `npm run sim`, `npm run bench`, `npm run evidence:2d`; round 3's harness in `docs/experiments/code/2026-10-30-form/`.

## Next
1. **The user** checks the look on the phone from PR's branch `claude/form-round3`.
2. **Form step 3** ([plan](plans/2026-10-30-form.md) §4): canopy closure. `light.csv` gains `lad`, plus a `buds.csv`; `closure.py`, `budget.py`. Say whether R1 starvation or O4's background mortality opened the gaps: 35–36 of 90 planted trees die of O4 by 300, windthrow 0–2. Carry in why the stand's leaf crown ratio rises from 150 to 300 at τ 0.
3. **Form step 4:** floor (τ 0) and crown lift with gap filling (C4 ξ, R4's release); planting density last. Then step 5, 20 seeds; step 6, apply.
4. **I3:** depth-ordered wood and leaves (the mixed wood's green wall); plate cap ≈ 200; framing; 3D first paint; re-time the phone.
5. **Species (track 3):** the 3D re-fit. Beech, hornbeam and now the fitted oak run to the top (oak pinned at 200 by season 150).

## Known issues
- **Uncalibrated:** floor 12–15% at τ 0 and τ 0.2; the stand's leaf crown ratio rises over time; storms' worst 10–40% loss (C5's).
- **`flora-fitted.ts` ≠ `m27_adopt.py`'s output:** the adopt script emits phyllotaxis and E, which `flora.ts`'s `in3d` overlay applies at runtime. Make the script reproduce the file before the re-fit; this round hand-edited r0, m_w and σ_break.
- **The garden's frame** fits half the 200 top (`WORLD_HEIGHT` 130 is stale): young gardens draw small.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Node:** this machine has 24. **Rust:** put `~/.cargo/bin` on PATH; wasm-bindgen-cli 0.2.129.
- **`npm run golden:update` uses the built WASM:** run `npm run build:wasm` first, or it writes stale hashes.
- **Species trees ignore world patches:** use `--species-patch` (`oakOpen`, the woods). `forest` plants no species.
- **Bash reserves `GROUPS`:** the readers take `RUN_GROUPS`.
- **Full check under 12 parallel runs** times out three vitest files; rerun when idle.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Evidence tests** fail a world past 1.5M metamers (`METAMER_CAP`); free each world in loops.
- **Laptop:** its local `claude/gallant-brown-5k4g33` has four unpushed 2D commits (ADR number clash "0024"). Left alone.
