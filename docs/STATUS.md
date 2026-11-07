# Status

_Last updated: 2026-11-07 (the night of 6–7 Nov reported, nothing adopted; **start with the [handover](plans/2026-11-07-handover.md)**: eight rulings for the user, then a serial plan)._

**Live:** garden **0.16.0** on edbarker.dev since 2026-11-06 (`3d-port` 39eaaab, tag `garden-v0.16.0`, site PR #8). It adds within-tree irregularity (ADR 0055) and natural heights for hornbeam, rowan and oak (R1's reproductive sink), with `PLATE_MAX` at 170. **Phone soak passed** (the user, 2026-11-06): no stutter, no empty forests, no tree unlike its kind. **Clutter (the user):** the garden's recruit cap is now a quarter (57 trees at 160 cells, 24 on the phone; [note](experiments/2026-11-06-garden-recruits.md)), passing G-forest; not yet released. The rest of the clutter is birch recruits growing as thin 25–30 m poles.

**Direction (the user, 2026-11-05): trees look like trees and like their species.** Species are chosen by data. Variation between trees (ADR 0053) can wait. Agents judge against objective measures; no visual judge has passed its calibration (the sim-vs-sim judge reached 69% against 75%, so its lone reads are advisory only).

## The box: 0.17.0, the species at the right size and shape, on a stable base (from 2026-11-06; [plan](plans/2026-11-06-box-0.17.md))
- **Rules:** gates fixed before results; G-forest against B0 (2/3/11/11, each ≥ base − 2); hard, soft or advisory measures ([validation policy](background/validation-policy.md)); no new mechanism without a measured mismatch.
- **Merged to `3d-port`, unreleased (#50–#63):** the recruit cap at a quarter; A0 (CI Python tests, `npm run regressions`, the policy); birch's trunk λ 0.53 (poles fixed) and twigs keep λ (ADR 0057, birch only); holly 15.2 m, willow 22.7 m; `faceWood` (ADR 0056, off, parked).
- **Why crowns sit low** (about 5% of H against a real 22–38%): the equal nine-species ring and a floor too bright (14–18% against 2–10%). A layered wood with a periodic depth (ADR 0058, off, draft PR #64) gives real crown bases and floor ([sheet](experiments/figures/2026-11-07-layered-wood-sheet.jpg)).
- **The night** ([note](experiments/2026-11-07-night2.md)): beech starves in shade through ADR 0044's spur lifespan (off rescues it, but misses G-forest hd300 by one against B0); crown v2 passes everything v1 blocked; oak (`claude/n3-oak`) loses its spire but reads as a fan; the [model DAG](background/model-dag.md) (`c5.T` dead, holly's vigour keys unread).
- **Waiting on the user** (handover §2): (1) beech lifespan off; (2) re-baseline G-forest to B1 (B0 predates the recruit cap: 229 trees against 57); (3) crown v2; (4) oak N3; (5) the layered wood as the garden; (6) checkpoint v3 (R1's deficit counts); (7) holly's dead keys; (8) merge #64, close #52.
- **Then:** the handover's serial plan, ending in the 0.17.0 RC (a fresh-process budget smoke as a release gate). After the box: one species end to end on held-out data; sycamore and ash.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D. Slab sweep in fixed lanes; checkpoints v2. Girth by the pipe model (ADR 0027).
- **Within-tree irregularity (ADR 0055):** stochastic lateral break, shoot-length SD, per-axis set-point and β offsets. All four in-tree descriptors sit in the real hornbeam bands, lone (TreeML) and stand (BioDiv); summed |z| 23 → about 5.
- **Reference instruments:** `analysis/treesim/` (`describe()`, `coarsen()`, scan-noise bands). On disk, git-ignored: TreeML (342 QSMs), the Belgian hedgerows (68), BioDiv (38 hornbeams). No QSMs exist for holly, willow or rowan.
- **Renderer and memory:** 64 depth slices; 197–211 MB on the laptop with the specimen at 170 cells, 113–117 MB on the phone; `?bench` reports `memoryMB`.
- **Species harness:** `hand-overrides.toml` → `m27_adopt.py` → `flora-fitted.ts` → `node cli/export-presets.ts`. Gallery of rejects in `analysis/fit/gallery/`.

## Known issues
- **Oak:** a spire-like leader over sprawling low limbs. **Flat tops** remain in places (garden seed 9).
- **Hornbeam's height patch is fragile:** the crown flips within ±0.01 of `r2.dLambda`. **Oak's stand branch density** is low (0.96 against ≥ 1.15 per m).
- **The slab damps depth leans** in the stand's face rows (ADR 0054). **Regeneration:** `forest` cannot regenerate under its own floor at τ 0. **The lab stutters** from season ≈ 75 on the phone.
- **Open questions (user):** `levels.2.setPoint` ≥ 80 collapses every broadleaf. Birch's pick stops growing after 60: form or fit?

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH. `npm run golden:update` needs `npm run build:wasm` first. **Python tests (142; CI runs those without reference data):** `uv run --project analysis --with pytest pytest analysis/tests -q`.
- **Gate:** `npm run check:stamp` in the foreground only (ADR 0047; [harness principles](background/harness-principles.md)). **Memory:** one fresh process per measurement; WASM memory never shrinks.
- **Panels:** headless Firefox through puppeteer-core against `npm run dev`. Species trees ignore world patches; use `--species-patch` (one level deep) or the gate tool's dotted `--patch`.
- **Choosing a knob:** check the [model DAG](background/model-dag.md) for dead levers and the sweep for sign and size first; record both in the step's plan.
- **G-forest:** `docs/experiments/code/2026-11-07-night2/gates/evidence2.py` (README there); its VERDICT line wrongly counts `hd300_all`.
- **Deploys:** a push to the site's `main` is production. Never merge `preview-3d`. Tags are the user's.
- **Reference data:** `data/reference/` is git-ignored; re-fetch by the URLs in the audit files and the manifest. Keep /tmp clean; it filled once.
