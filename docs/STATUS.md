# Status

_Last updated: 2026-11-01 (C1 rounds 1–2 merged (PR #22); the port branch renamed `3d-port`; a handover for an independent review)_

**3D port** on the branch `3d-port` (was `claude/gallant-brown-5k4g33`; work branches open PRs into it). ADR 0024 and **0025 accepted** (V passed; the phone's seasons all under 250 ms in one lane). **ADR 0026 accepted** (256 MB; garden plates above ≈ 200 cells out of scope). The checklist before C1 is done ([note](experiments/2026-10-31-pre-c1.md)):
- Canvas 2D paints 3D stands; memory ≈ 1 MB a cell of plate width; threads and worker lanes parked;
- the backlog runs without traps: 39 of 78 pass;
- the woods' top is 200, after a crown pinned at 130 ran away.

C1 round 2 ([note](experiments/2026-11-01-c1-round2.md)), merged with round 1 in PR #22:
- R5 senses neighbours by default; the interior's stands are planted per area (`perArea`); goldens updated;
- `forest` and the lone tree level off (82, 87) with R1 unchanged; the beech wood and the mixed wood's beech and hornbeam still run to the top;
- floor 17%, the same under the crowns (an all-oblique sky); crown base held by no C5 threshold.

## Works
- **Core** (`rust/core`, one build): C1–C6, R1–R6, O2, O4 in 3D; the slab sweep in fixed lanes; checkpoints v2; `geom.rs` for frames.
- **Species** (`flora.ts` over `flora-fitted.ts`), uncalibrated in 3D. **Presets** in 3D; woods' top 200 (`TOP`).
- **Garden** (`mountGarden`): the 3D core, growing from seed (no opening forests until I3). The live site stays on 0.14.0 (2D).
- **Headless:** `npm run sim`, `npm run bench`, `npm run evidence:2d` (≈ 4 h); C1's harness `code/2026-10-31-c1/` (`runs.sh`, `c1.py`, `floor.ts`).

## Next
1. **An independent review** of the port so far, from `reviews/2026-11-01-3d-port-handover.md`.
2. **The user:** bring the species' R1 forward (beech, hornbeam: C7–C8's height part)? Round 3 on the stand's leaf area and the sky's zenith band, before any floor knob?
3. **Round 3 (C1):** what limits the stand's leaf area while its lowest leaves earn 4× their keep; whether the sky needs a zenith band; then the floor, crown base and the interior's τ. Evidence at 20 seeds.
4. **Time the phone again:** `forest` carries 105k metamers in depth (59k before); the garden's planting tripled.
5. **I3:** one lane; cap the plate at ≈ 200 (ADR 0026); depth-ordered drawing; framing under the taller top; first paint (Q7).

## Known issues
- **Uncalibrated:** crown ratio 0.99 everywhere; H/D 6–18 (target 60–80, C2's girth); species heights (beech, hornbeam run to the top); `shadow` and R1 off do not regulate (backlog).
- **The garden's "world" frame** fits at least half the top: young gardens draw smaller under the 200 top.
- **The preview deploy** (`preview-3d`) still has the old `i2.ts`: redeploy only when the user asks.
- The renderer draws leaves after all wood (I3).

## Notes for the next session
- **Node:** this container's default is 22: `npm i node@24` in the scratchpad, its `bin` first on PATH. **Rust:** `cargo install wasm-bindgen-cli --version 0.2.129 --locked`.
- **Evidence tests:** fail a world past 1.5M metamers (`METAMER_CAP`); free each world in loops.
- **Laptop:** its local `claude/gallant-brown-5k4g33` (now `3d-port` on GitHub; its upstream is gone) has four unpushed 2D commits (ADR number clash "0024"). Left alone.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Golden-safe means bit-identical:** goldens and `npm run bench -- --compare`.
