# Status

_Last updated: 2026-11-06 (0.16.0 released; ADR 0055 accepted; the overseer's box closed: [plan](plans/2026-11-05-overseer.md), [night](plans/2026-11-06-overnight.md))._

**Live:** garden **0.16.0** on edbarker.dev since 2026-11-06 (`3d-port` 39eaaab, tag `garden-v0.16.0`, site PR #8). It adds within-tree irregularity (ADR 0055) and natural heights for hornbeam, rowan and oak (R1's reproductive sink), with `PLATE_MAX` at 170. **Phone soak passed** (the user, 2026-11-06): no stutter, no empty forests, no tree unlike its kind. **Clutter (the user):** the garden's recruit cap is now a quarter (57 trees at 160 cells, 24 on the phone; [note](experiments/2026-11-06-garden-recruits.md)), passing G-forest; not yet released. The rest of the clutter is birch recruits growing as thin 25–30 m poles.

**Direction (the user, 2026-11-05): trees look like trees and like their species.** Species are chosen by data. Variation between trees (ADR 0053) can wait. Agents judge against objective measures; no visual judge has passed its calibration (the sim-vs-sim judge reached 69% against 75%, so its lone reads are advisory only).

## The box: 0.17.0, the species at the right size and shape, on a stable base (from 2026-11-06; [plan](plans/2026-11-06-box-0.17.md))
- **Rules:** gates fixed before results; G-forest against B0 (2/3/11/11, each ≥ base − 2); measures labelled hard, soft or advisory, and no visual fix counts as validation without an independent gate; no new mechanism without a measured mismatch ([external review](reviews/2026-11-06-external-review.md), folded in).
- **A0, done (the review; defects are issues #52–56; `main` catches up by draft PR #51):** docs truth and the Pages build (#50); Python tests in CI (six bad TreeML QSMs excluded, G-reg unaffected); `npm run regressions` for #54 and #55; the [validation policy](background/validation-policy.md) (hard, soft, advisory).
- **A1, birch:** trunk λ 0.53 adopted: poles 18 of 20, lone height 39 m, G-forest 0/1/9/11 (at the limits). Leafier birch fails crown base in all 4 variants, probably through the one-tree lone comparator; **the user's question:** a per-species, multi-seed crown-base gate ([note](experiments/2026-11-06-birch-poles.md)).
- **A2, done:** young trees' trunk is not ADR 0055's doing. Garden crowns reach about 5% of H in every species (real stands 22–38%, hedgerow oaks 20%), a self-pruning gap for a later box ([note](experiments/2026-11-06-crown-base.md)). **A3, done:** holly 15.2 m and willow 22.7 m through the reproductive sink; beech already in band. Holly's top turns pointed: to be looked at.
- **A4 (the user's priority), parked:** the garden's low crowns are its light boundary, not C5. `world.faceWood` (a virtual wood beyond the faces, off by default) with a 7 m slab gives a real wood's floor (18/20) but thins the garden to 0.15× foliage and fails the crown-base gate. Sparser forest look or a foliage question: the user's call ([note](experiments/2026-11-06-crown-base.md)). **A5:** lone D in band for hornbeam; beech and birch flat at 100 only; willow flat; oak pointed (form work).
- **Afternoon** ([plan](plans/2026-11-06-day2.md)): **birch's twigs keep λ** (ADR 0057): its crown rounds into the real band. Beech and willow are not rounded. Shade does not strip foliage; production falls, and today's garden is denser than real woods (agent F). No middle forest look passes. Oak's form is under way.
- **Evening (A6):** the garden's crowns stay low because of the equal nine-species ring and a too-bright floor (14–18% against a real 2–10%). A layered wood with a periodic depth (ADR 0058, off) gives hornbeam and oak real crown bases and a real floor, but planted beech starves at 3–5% light. Beech's shade carbon balance goes to the night.
- **The night:** oak's decurrent form; the flat cap; a sensitivity sweep of the adopted species params. **B:** the RC with a fresh-process budget smoke as a release gate.
- **After the box:** one species end to end on held-out data (beech or oak); sycamore and ash into the garden.

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
- **Panels:** headless Firefox through puppeteer-core against `npm run dev`. Species trees ignore world patches; use `--species-patch`.
- **Deploys:** a push to the site's `main` is production. Never merge `preview-3d`. Tags are the user's.
- **Reference data:** `data/reference/` is git-ignored; re-fetch by the URLs in the audit files and the manifest. Keep /tmp clean; it filled once.
