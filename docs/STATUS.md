# Status

_Last updated: 2026-10-31 (before C1 and C1 round 1 accepted; round 2 starts with height)_

**3D port** (branch `claude/c1-calibration-ustbkz`, PRs into `claude/gallant-brown-5k4g33`). ADR 0024 and **0025 accepted** (V passed; the phone's seasons all under 250 ms in one lane). **ADR 0026 accepted** (256 MB; garden plates above ≈ 200 cells out of scope). The checklist before C1 is done ([note](experiments/2026-10-31-pre-c1.md)):
- Canvas 2D paints 3D stands; memory ≈ 1 MB a cell of plate width; threads and worker lanes parked;
- the backlog runs without traps: 39 of 78 pass;
- the woods' top is 200, after a crown pinned at 130 ran away.

C1 round 1 ([note](experiments/2026-10-31-c1-round1.md)):
- the floor (15%) is held by R6's Q_ss, then by gaps between crowns;
- the crown base never lifts;
- R5's own-shade signal makes 3D crowns poles.

## Works
- **Core** (`rust/core`, one build): C1–C6, R1–R6, O2, O4 in 3D; the slab sweep in fixed lanes; checkpoints v2; `geom.rs` for frames.
- **Species** (`flora.ts` over `flora-fitted.ts`), uncalibrated in 3D. **Presets** in 3D; woods' top 200 (`TOP`).
- **Garden** (`mountGarden`): the 3D core, growing from seed (no opening forests until I3). The live site stays on 0.14.0 (2D).
- **Headless:** `npm run sim`, `npm run bench`, `npm run evidence:2d` (≈ 4 h); C1's harness `code/2026-10-31-c1/` (`runs.sh`, `c1.py`, `floor.ts`).

## Next (the user's round 2 decisions, 2026-10-31)
1. **Height first:** find the R1 setting (L_h, m_w, m_f or the pipe-area cost) at which a lone tree and `forest` level off on their own under the 200 top; height against season to 300, three seeds. No floor, crown or H/D number from a still-growing stand counts.
2. **R5 senses neighbours in every preset.** Q_ss stays at 0.1 until height levels off.
3. **The interior's stand fills the slab's depth** (planting per area); the floor is measured under the crowns. The lone tree and the hedgerow stay one row.
4. **Crown base:** check whether it lifts once (1) and (3) hold, before adding anything; if not, name the C5 threshold holding it.
5. Round 2 reports round 1's tables plus height against season, and proposes the forest and sky settings with their golden change in one PR.
6. **I3:** one lane; cap the plate at ≈ 200 (ADR 0026); depth-ordered drawing; framing under the taller top; first paint (Q7).

## Known issues
- **Uncalibrated:** crown ratio 0.99 everywhere; H/D 11–30 (target 60–80, C2's girth); `shadow` and R1 off do not regulate (backlog).
- **The garden's "world" frame** fits at least half the top: young gardens draw smaller under the 200 top.
- **The preview deploy** (`preview-3d`) still has the old `i2.ts`: redeploy only when the user asks.
- The renderer draws leaves after all wood (I3).

## Notes for the next session
- **Node:** this container's default is 22: `npm i node@24` in the scratchpad, its `bin` first on PATH. **Rust:** `cargo install wasm-bindgen-cli --version 0.2.129 --locked`.
- **Evidence tests:** fail a world past 1.5M metamers (`METAMER_CAP`); free each world in loops.
- **Laptop:** its local `claude/gallant-brown-5k4g33` has four unpushed 2D commits (ADR number clash "0024"). Left alone.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Golden-safe means bit-identical:** goldens and `npm run bench -- --compare`.
