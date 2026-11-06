# Status

_Last updated: 2026-11-06 (0.16.0 released; ADR 0055 accepted; the overseer's box closed: [plan](plans/2026-11-05-overseer.md), [night](plans/2026-11-06-overnight.md))._

**Live:** garden **0.16.0** on edbarker.dev since 2026-11-06 (`3d-port` 39eaaab, tag `garden-v0.16.0`, site PR #8). It adds within-tree irregularity (ADR 0055) and natural heights for hornbeam, rowan and oak (R1's reproductive sink), with `PLATE_MAX` at 170. **Phone soak passed** (the user, 2026-11-06): no stutter, no empty forests, no tree unlike its kind. **The user finds the forest cluttered:** the recruit cap (229 on the laptop, 94 on the phone, sized for the old three rows) fills with suppressed saplings by about season 80; cutting the garden's `recruits` is being tested.

**Direction (the user, 2026-11-05): trees look like trees and like their species.** Species are chosen by data. Variation between trees (ADR 0053) can wait. Agents judge against objective measures; no visual judge has passed its calibration (the sim-vs-sim judge reached 69% against 75%, so its lone reads are advisory only).

## The box: 0.17.0, the garden's species at the right size and shape (2 sessions and 1 night, from 2026-11-06)
- **Gates, fixed now:** **G-forest** against B0, not re-baselined (`forestParams(160)`, 20 seeds, 300 seasons, each count ≥ base − 2; B0 is floor 2, planted H/D 3, crown base 11, plateau 11; 0.16.0 sits at 1/1/12/13, so planted H/D has no headroom). **Budget:** under 230 MB with the specimen; phone time ≤ 1.3×. Scripts: `experiments/code/2026-11-06-overnight/`.
- **Session A:**
  - **Heights through the reproductive sink,** one commit per species: beech (39 m, flat top, now 37% of the garden), then birch (45–49 m column), willow and holly (above 1.3× their Level 0 band). Pass: lone height at 150 in the Level 0 band, D and W/H no worse than 0.16.0, G-forest and the budget.
  - **Young trees' clear trunk:** check before fixing. The advisory judge's reference was TreeML's street trees, which are crown-lifted. If the stand at about 40 seasons is fine against BioDiv and Wytham, record it as a reference artefact.
  - **Phone, seed 3:** find why it empties by 150 in native runs (the soak saw no empty forest). Swap the seed if the cause isn't quick.
- **The night:** prototypes, off by default, each with a gate fixed before the run. **Oak's decurrent form:** count the lone oak references first (TreeML about 4, plus the Belgian hedgerows). **The flat cap:** λ's fall by level, with twigs keeping λ; pass is a lone dome without `dLambdaTrunk`'s tiered column.
- **Session B:** an RC, sheets, `preview-3d`; the user merges and tags.
- **After the box:** sycamore and ash enter the garden (Wytham, FOR-species20K); then lime and Norway maple, lone only.

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
- **Rust:** put `~/.cargo/bin` on PATH. `npm run golden:update` needs `npm run build:wasm` first. **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q`.
- **Gate:** `npm run check:stamp` in the foreground only (ADR 0047; [harness principles](background/harness-principles.md)). **Memory:** one fresh process per measurement; WASM memory never shrinks.
- **Panels:** headless Firefox through puppeteer-core against `npm run dev`. Species trees ignore world patches; use `--species-patch`.
- **Deploys:** a push to the site's `main` is production. Never merge `preview-3d`. Tags are the user's.
- **Reference data:** `data/reference/` is git-ignored; re-fetch by the URLs in the audit files and the manifest. Keep /tmp clean; it filled once.
