# Status

_Last updated: 2026-11-01 (an independent review of the port; the path to a shippable 3D garden agreed)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024, 0025 and 0026 accepted. C1 rounds 1–2 merged (PR #22). The live site stays on 0.14.0 (2D) until the bar below is met.

**The review** ([2026-11-01](reviews/2026-11-01-3d-port-review-2.md)) corrects three of round 2's diagnoses:
- R1's sapwood cost is linear in tips, not in trunk area: thick trunks don't raise it. H/D is C6's r0 alone; lower r0 and raise m_w to keep m_w·r0².
- The sky has a near-zenith band (72.5–90°). The floor is uniform because the canopy is thin: it needs 1.3–2× its leaf area, not a new sky.
- The woods run the *fitted* beech (hyperbolic L_h 109, Q_ss 0.013), not the hand one: re-fit in 3D.
- The crown-base measure (lowest live first-order branch) cannot lift: redefine it by leaf area.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2.
- **Garden** (`mountGarden`) runs the 3D core through the 2D renderer, growing from seed.
- **Headless:** `npm run sim`, `npm run bench`, `npm run evidence:2d` (≈ 4 h, 39 of 78); C1's harness in `docs/experiments/code/`.

## Next (I3 alongside C1 + C2, alternating sessions)
1. **Form (C1 + C2):** [plan](plans/2026-10-30-form.md): scars record the pipe radius, then r0 ÷ 8 and m_w × 64 (H/D 66 in a 3-seed test); the crown base by leaf area; canopy closure; then floor (read at τ 0), crown lift and H/D together, ≥ 15 of 20 seeds.
2. **I3:** depth-ordered wood and leaves; plate cap ≈ 200; framing under the 200 top; 3D first paint (Q7); drop unread snapshot columns; re-time the phone.
3. **Species (C7–C8):** prepare the 3D fit (warm start, short trials, native threads; throughput first). The fits run overnight on the user's 12-core machine.
4. **Then:** C3–C6 as hold-outs; ADRs (first paint, R5's default); release; the site's PR.

## Known issues
- **Uncalibrated:** floor 17% at τ 0.2 (half of it from the faces: 6–9% at τ 0), crown ratio 0.99, H/D 6–18 (scars carry stress wood into the trunk); beech and hornbeam run to the top.
- **The garden's frame** fits half the 200 top (`WORLD_HEIGHT` 130 is stale): young gardens draw small.
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.
- Housekeeping list: the review's §6.

## Notes for the next session
- **Node:** this container's default is 22: `npm i node@24` in the scratchpad, its `bin` first on PATH. **Rust:** `cargo install wasm-bindgen-cli --version 0.2.129 --locked`.
- **Evidence tests:** fail a world past 1.5M metamers (`METAMER_CAP`); free each world in loops.
- **Laptop:** its local `claude/gallant-brown-5k4g33` has four unpushed 2D commits (ADR number clash "0024"). Left alone.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Golden-safe means bit-identical:** goldens and `npm run bench -- --compare`.
