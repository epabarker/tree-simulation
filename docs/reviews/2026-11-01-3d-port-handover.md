# 3D port: handover for an independent review (2026-11-01)

**For:** an agent asked to review the 3D port so far and recommend next steps.
**State:** the branch `3d-port` (renamed from `claude/gallant-brown-5k4g33`) at 2e92488 (PR #22 merged): the pre-C1 checklist, and C1 calibration rounds 1 and 2.
**Written by:** the agent that did I2's follow-up, the pre-C1 work and C1 rounds 1–2. Treat its conclusions as claims to check, not settled facts. "Where to push back" lists what deserves the hardest look.

## How to use this document
- **Purpose:** this is a map, not the evidence. Every number here comes from a note in `docs/experiments/`, with the commands that produced it.
- **Read first:**
  - `AGENTS.md` (invariants and conventions);
  - `docs/STATUS.md`;
  - [ADR 0024](../decisions/0024-3d-slab-port.md) (the port's design);
  - the [3D port review](2026-10-29-3d-port-review.md) (why the port, its gates, its calibration plan, §4).
- **`docs/spec.md`** is long (≈ 25k tokens): read only the sections cited.
- **Decision rights:** the user owns the project's decisions. Anything that contradicts the spec or an ADR is a question for them, recorded as a new ADR once agreed.

## 1. What the port is for
- **Before:** the simulator grew trees in a 2D plane (spec §2, "Option P"), which made them look like fans.
- **The goal** (user, 2026-10-29): trees that grow in 3D, with crowns that are volumes and buds competing in depth. They are still drawn as the garden's flat, frontal, orthographic illustration, with depth showing only through silhouette and overlap.
- **Out of scope:** perspective, a free camera, a full volume, periodic z, WebGPU, and a dual 2D/3D core.

**The world** (ADR 0024):
- a slab W × H × D, D = 64, periodic in x (a ring) and open in z;
- buds beyond a face get no light. The sky beyond each z face is seen through a transmission τ:
  - **wood interior** (τ 0.2, 0.2): the default look;
  - **wood edge** (1, 0.2);
  - **hedgerow** (1, 1).
- **Light:** a row-marched Beer–Lambert sweep, K = 16 sky directions with rotation, Float32, whole-cell-shift transport.

**The core moved to Rust:** WASM for the page, native for the CLI.
- The TypeScript core was deleted at I1, after the Rust core reproduced every 2D golden bit for bit.
- The 2D goldens are archived at the tag `golden-2d-ts`, which CI's `golden-2d` job runs.

## 2. Timeline

| Step | What it established | Note |
|---|---|---|
| G0 review | Go, through gates. About 8 calibration milestones expected (C1–C8) | `reviews/2026-10-29-3d-port-review.md` |
| G1 | Light kernel on the user's Pixel 8a: 32 ms at D = 32, 43 at D = 64 | `experiments/2026-10-29-open-slab-cost.md` |
| Prototype, τ | Throwaway 3D growth: m 13–26 while growing; τ sets the lower crown and the look | `…-proto3d.md`, `…-face-transmission.md` |
| G2 | 2D sky sweep in Rust, 27/27 goldens bit for bit (V8's `Math` ported) | `…-g2-rust-sweep.md` |
| G3 | 3D slab sweep in Rust: 0.045–0.053 mean error against an exact trace, K 16 converged | `…-g3-slab-light.md` |
| I1 | Whole 2D core in Rust, bit-identical; TypeScript core deleted; parity became a proof, not a mode | `…-i1-rust-core.md` |
| I2 | Trees grow in 3D with every principle (ADR 0025: frames by parallel transport, phyllotaxis, vector C4 and R3, E 4·10⁶) | `…-2026-10-30-i2-3d-growth.md` |
| V | The user's visual check on the phone: accepted; ADR 0025 accepted | STATUS, devlog |
| Before C1 | Canvas 2D fallback, memory budget (ADR 0026), evidence harness, threads, the world's top | `…-2026-10-31-pre-c1.md` |
| C1 round 1 | `forest` and a lone tree, 18 single-knob variants: what holds floor, crown base and crown shape | `…-2026-10-31-c1-round1.md` |
| C1 round 2 | Height first; R5 on neighbours; the stand planted in depth; the crown base diagnosed | `…-2026-11-01-c1-round2.md` |

I3, the 3D renderer (depth-ordered drawing, first paint, checkpoints), has not started. **The user chose to calibrate (C1) before I3**, which ADR 0024 allows: C1 reports coverage with today's leaf drawing.

## 3. Where things stand

### Works and is tested
- **Core:** every principle in 3D (C1–C6, R1–R6, O2, O4).
  - The same bits natively and in WASM, on one thread or four (fixed light lanes).
  - 14 3D goldens, structural invariants checked every season, checkpoint v2 (v1 loads as a planar forest).
- **Checks:** `npm run check` and CI (`check`, `golden-2d`) are green on the base branch.
- **The garden** (`mountGarden`) runs the 3D core and grows from seed. The live site stays on the 2D release 0.14.0.

### Measured on devices
**V:** passed.

**Season time on the user's phone, from season 40:**

| Stand | One light lane | Four lanes |
|---|---|---|
| Hedgerow (the slowest) | 219 ms | 197 ms |
| Interior | 145 ms | 130 ms |
| Garden plate, 160 cells | 163 ms | 127 ms |
| Garden plate, 66 cells | 67 ms | 56 ms |

The budget is 250 ms. These times predate round 2, which raised `forest`'s metamers from 59k to 105k by planting in depth. **The phone has not been re-timed.**

### Decisions made (user)
- **D, τ and the light:** D = 64; τ per face with the interior as default; whole-cell-shift light (ADR 0024, accepted).
- **I2's design:** ADR 0025, accepted.
- **Memory** (ADR 0026, accepted): the garden's worker holds at most 256 MB of WASM memory. Memory is about 1 MB per cell of plate width at D = 64, with the top at 200. Garden plates above about 200 cells (the 520 panorama included) are out of the garden's scope.
- **Parallelism:** one light lane is the I3 path.
  - WASM threads need nightly Rust and cross-origin isolation: parked.
  - Worker lanes' return trip (24–118 ms) costs what they save: parked.
- **The world's top is 200 for the woods.** At 130, a crown pinned at the top ran away (the garden's beech went from 8k to 293k metamers).
- **R5 (shade avoidance) senses neighbours' shade in every preset** (round 2). Own shade made 3D lone trees into poles; "light" is kept as the ablation.
- **The interior's stands fill the depth** (`perArea`: three staggered rows about 21 cells apart). The floor is to be measured under the crowns. The lone tree and the hedgerow stay one row.
- **Height first:** no floor, crown or H/D number from a stand that is still growing counts toward C1.

### C1's targets: where they stand (`forest`, interior, 3 seeds, levelled stands)

| Target | Wanted | Now | Read |
|---|---|---|---|
| Height levels off on its own | yes, below the top | **yes:** `forest` ≈ 82, lone tree ≈ 87, flat from season 120 to 300 | R1 unchanged; the climb was R5's own-shade signal |
| Floor light, closed stand | 2–10% of open sky | **17%**, the same under crowns as in gaps; 11% at the lowest Q_ss tried | not met |
| Crown base lifts in a stand, not alone | yes | **no:** crown ratio 0.98–0.99 everywhere | not met |
| H/D (slenderness), stand | 60–80 | **6–18** | not met (C2's girth) |
| Edge lean | toward the open face | 0.85–0.93 cells toward it | direction right, size unjudged |
| Individual crown tops | crowns keep their own tops | 0.77 interior; 0.17 hedgerow (a wall) | — |
| m (3D / 2D metamers) | unset target | ≈ 55 in depth | cost, see above |

### Known open problems
1. **The species' heights.** The beech wood runs to the 200 top (1.3–2.6M metamers by season 300). The mixed wood's beech and hornbeam reach 196–206. These are the species' own R1 settings; beech at L_h 30 slows but does not stop. The garden's mixed wood depends on this.
2. **The floor does not respond to the canopy above it.**
   - Ground light under LAI 0 and under LAI 12+ is the same (0.168 against 0.167).
   - The slab's sky has no zenith direction (lowest band 15°, all oblique), so the floor is the canopy's mean transmission over long slanted paths.
   - R6's short-shoot threshold Q_ss moves the floor (21% at 0.2, 11% at 0.03), but low values empty the upper canopy of young leaves.
3. **The crown base.** No C5 threshold holds the lower branches: they get ≈ 3× the shedding light and produce ≈ 4× their maintenance. The canopy is too thin to shade its own lower crown (crowns cover 54–65% of the ground).
4. **Thick trunks.** H/D 6–18 means C6's pipe radius r₀ is far too large for 3D's leaf counts. This also raises R1's sapwood cost.
5. **The 2D evidence backlog** (`tests/evidence-2d/`, `npm run evidence:2d`, about 4 hours): 39 of 78 tests pass. `shadow` (C3 off) and R1-off don't regulate in 3D.
6. **Unexplained memory.** About 40 B per cell of WASM memory is not yet accounted for (fragmentation is the suspect).
7. **The garden's framing** under the 200 top draws young gardens smaller (I3's).

## 4. Where to push back (questions for the reviewer)
Round 2's author would most like these checked independently:
1. **Is the floor target reachable with this sky, or is the sky wrong?**
   - The 2–10% target was calibrated in 2D (M6e).
   - Is an all-oblique sky (K = 16, minimum elevation 15°, rotating) a modelling choice the spec (§C2.4) intends? Or does the 3D slab need a zenith band?
   - What would a real closed stand's floor be under this sky's radiance distribution?
2. **What limits the stand's leaf area?** Its lowest leaves earn four times their keep, yet the canopy stays thin and gappy. Round 2 did not find the limiter. Candidates:
   - R4 bud break: R4 off made the floor brighter, not darker;
   - R1's sapwood cost through thick trunks;
   - R6;
   - O2's abrasion (crown shyness);
   - a light/allocation interaction specific to 3D.
3. **Are R5 on neighbours and planting in depth right?** Both were the user's decisions after round 1's evidence. Is the evidence (`c1-round1` §3, `c1-round2` §1) strong enough? Does neighbours-only shade avoidance lose anything the 2D model needed (M10's stand H/D)?
4. **Was "R1 needs no change" right?** It rests on `forest` and a lone tree with 3 seeds, and on the generic params, not the species'.
5. **Order of the remaining work.** Candidates the user has not yet chosen between:
   - species R1 (beech, hornbeam) brought forward from C7–C8;
   - a C1 round 3 on leaf area and the sky;
   - C2 (girth, H/D), since thick trunks may feed problems 2–4;
   - I3, since the garden cannot ship 3D without it, and the phone needs re-timing at round 2's metamer counts.
6. **Method.** The calibration rounds use 3 seeds (exploration), while AGENTS.md requires ≥ 20 for evidence. Are any conclusions drawn more firmly than 3 seeds allow? Are the measures in `c1.py` the right ones? In particular:
   - "own tops";
   - "crown cover" (LAI ≥ 1);
   - young tips as a proxy for leaves.

## 5. Where the evidence is
- **Notes:** `docs/experiments/2026-10-3*-*.md` and `2026-11-01-c1-round2.md`. Each has Question, Setup (exact commands), Result, "What would have stopped it" and a Conclusion.
- **Their code:**
  - `docs/experiments/code/2026-10-31-pre-c1/`, `…/2026-10-31-c1/` and `…/2026-11-01-c1-round2/` (run scripts, analysis, saved outputs such as `stand.txt`, `height.txt`, `woods.txt`, `memory.jsonl`);
  - figure: `docs/experiments/figures/2026-11-01-c1r2-height.png`.
- **ADRs:** 0024 (the port), 0025 (I2's design), 0026 (memory).
- **History:** `docs/devlog.md` (newest first), `docs/ROADMAP.md` (milestones, principle tracing table; the 3D port entry under "Possible" lists every step).

## 6. Reproducing
- **Toolchain:** Node 24, Rust (rustup reads `rust-toolchain.toml`), `wasm-bindgen-cli 0.2.129`, uv (`analysis/`). STATUS's "Notes for the next session" covers this container.
- **Commands:**
  - `npm run check`: everything CI runs;
  - `npm run sim -- --preset forest --seasons 300 --light --out runs/x`: one native run (`--light` adds `light.csv` and `ground.csv`);
  - the notes' Setup sections: each table.
- **Costs:** a 300-season `forest` run with 30 trees takes ≈ 15–25 minutes natively on a 4-core VM. The full evidence backlog takes ≈ 4 hours.
