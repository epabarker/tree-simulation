# Status

_Last updated: 2026-10-30 (I3 steps 1–2: the picture in depth, the plate, the garden's planting)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0027 accepted. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0):** floor at 100 20 of 20; H/D at 300 19 of 20; crown base 20 of 20; plateau 17 of 20.
- **Renderer (I3 steps 1–2):** wood and leaves far to near in 64 depth slices from the snapshot's `zOrder`; per-snapshot work −55–60%; the slices cost 0.5–0.6 ms a frame.
- **Garden:** one row at spacing 28; plate ≤ 160 cells, framed at 65 when young. Phone (seed 10, 40 seasons): draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms, 10.2k metamers.
- **Headless:** `npm run sim`, `npm run bench`; `scene.bench.ts` times per frame and per snapshot; I3's harness in `docs/experiments/code/2026-10-30-i3*/`.

## Next
1. **I3 step 3:** profile the snapshot's `tree_metrics` (a lean cadence for the garden if it dominates).
2. **I3 step 4:** foliage coverage in `?bench`; leaf opacity and `LEAF_MIN_PX` judged on the phone. Judge the garden at season 100 (needs a faster way there: a dev `?intro=`).
3. **I3 steps 5–6:** time `growStill` on the phone (reduced motion); ADR 0028 on first paint; a Canvas 2D `?bench` on the phone's plate.
4. **Species** ([plan](plans/2026-10-30-species.md), decided): a least-squares re-fit from the round-2 fits (a 3D candidate-seed costs 30–55 s, 20–33× 2D's; LM ≈ 3 h for the garden's eight on 12 cores); r0 with m_w derived; floor to the hold-out in own woods at τ 0; first `m27_adopt.py` reproduces `flora-fitted.ts`; pilot beech on the VM.
5. **Then:** C3–C6 as hold-outs; release; the site's PR.

## Open questions (user)
- Two trees very close together at spacing 21 (a recruit beside a planted trunk): watch for it at 28.
- The τ 0.1 reading (form note): no preset's τ changed.

## Known issues
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's).
- **`flora-fitted.ts` ≠ `m27_adopt.py`'s output**; r0, m_w and σ_break were hand-edited.
- **The lab stutters** from season ≈ 75 on the phone (the full snapshot, 60–110k metamers).
- **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH (`npm run bench` needs cargo too). **`npm run golden:update`** needs `npm run build:wasm` first.
- **Benches:** `garden.html` takes `?seed=`; without it each visit is a random forest. SwiftShader's frame p95 cannot judge per-snapshot work: use `scene.bench.ts`. Playwright is not in the repo (install it in a scratch folder).
- **Species trees ignore world patches:** use `--species-patch`. A `forest` run writes ≈ 175 MB.
- **Evidence tests** fail a world past 1.5M metamers; free each world in loops.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
