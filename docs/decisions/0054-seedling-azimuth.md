# 0054: A per-tree azimuth for the seedling's frame

- **Status:** accepted on merge (the user, 2026-11-05).
- **Spec:** §C1 (the seedling, phyllotaxis), §C4 (the set-point target). ADR 0002 (keyed randomness), 0024 (the
  slab), 0025 (frames), 0033 (the relay).
- **Evidence:** [the lean audit](../experiments/2026-11-05-lean-audit.md) (before, and "After ADR 0054").

## Context
- **What was planted:** `plant_seedling` (`rust/core/src/principles/c1.rs`) gave every seedling the same frame: heading
  up, and reference **L = +x**.
- **How the set point read it:** C4's set-point target takes its azimuth from `horizontal_heading` (`c4.rs:13–19`).
  That is d's own flat part, and for a vertical d, L's flat part. So a leader with a trunk set point ≠ 0 grew its
  first shoot toward world +x in every tree: beech's 40°, and hornbeam's 30°.
- **The feedback:** from then on, the side came from the leader's own lean.
- **What the audit measured:**
  - The stand's leans: concentrated at 352–0° (Rayleigh p ≤ 7e-3 on the middle row; age 2: 231–236 of 240 positive).
  - The crown centroids: +1.1 m in x.
  - That was ADR 0051's suspected "+x reach".
- **The audit's test:** flipping only L's sign (a lean of −1e-6°) flipped the lean. The sky, the planting's mirror
  and the sky's phase were ruled out.

## Decision
- **The rule:** each seedling's reference is turned about its heading by φ = 2π·uniform(seed, `SEEDLING_AZIMUTH`,
  tree id, 0, 0, 0).
  - `seedling_azimuth` in c1.rs; `plant_seedling` takes it as an argument, and φ = 0 is the old frame, bit for bit.
  - Every planting path passes it: `world.rs` (initial trees, and `plantTree` events) and `o4.rs` (dispersal and
    seed rain).
  - Unit tests pass 0.
- **The key is the tree's id alone.** Ids are never reused: `world.trees` only grows (o4 pushes, and the checkpoint
  restores the vector whole). So recruits, replays and checkpoints reproduce φ.
- **A new purpose, `SEEDLING_AZIMUTH` = 14,** appended to `rng.rs`'s registry (never renumbered) and to
  architecture.md's draw table. ADR 0053's proposed `INDIVIDUAL` takes 15.
- **`lean` keeps its world meaning:** the heading still tilts in the x–y plane, and a leaned tree's set point follows
  that heading's flat part. Only L turns, about the heading. A deliberate lean (M3, the audit's ±ε controls) still
  points where it is told.

## Other +x defaults, looked at and left
- **`horizontal_heading`'s last fallback, +x** (`c4.rs:18`): unreachable for a valid frame. L ⟂ h, so a vertical d
  always has a horizontal L.
- **`any_perpendicular`'s +x** (`geom.rs:58–61`): a degenerate fallback, not a per-tree default. It is used for a
  lateral parallel to its host (`c1.rs:125`), in C4's noise turn when L is not ⟂ d (`c4.rs:34`), and in
  `turn_between`'s antiparallel case (`geom.rs:133`, which R3's ground rest calls at `r3.rs:291`). Each is
  unreachable while L ⟂ h, so this change does not touch them.
- **R3's ground rest** (`r3.rs:285`): reads `horizontal_heading`, so this change covers it.
- **`lib.rs` `planar()`:** the frame of a v1 (2D) checkpoint, the shipped 0.14.0 forests. Those bytes must not change.
- **The TypeScript side** builds no frames: `src/core` is data, and the page reads snapshots.

## Consequences
- **Every species' phyllotaxis plane now turns per tree** (the axis's first azimuth is measured from L), and so does
  the direction noise's azimuth origin.
- **Every golden changes (16 of 16).** With φ forced to 0, the old goldens pass natively and in WASM, so the change is
  the azimuth and nothing else.
- **Out of scope: the arch's magnitude.**
  - The stand's lean is ≈ 10°, against BioDiv's 4.1°. Troll's 40° set point and the leader's self-feeding side make
    it, and this change leaves it as it was (the audit's alternating-L control: 10–12°).
  - It is a separate ADR, with the relay decision (an erect relay that overtakes the arch, or R3's straightening).
- **Not geometry-neutral.**
  - Half the leans now point into depth: a bounded 16 m axis with faces, where x is a ring (the stand) or 160 cells
    (the lone tree).
  - A lean into depth looks straighter in the frontal picture.
  - Level 0's lone-tree width and W/H read x only.
  - What the faces do to depth leans is measured in the audit's "After ADR 0054" section (an axial test).
  - **Measured there:** the stand's middle row is not axial (p 0.26–0.85). The face rows are: depth leans are
    damped and gather on ±x (v4: axial p 3e-3 per face row; depth's SD 8–24% under x's over all 12).
  - If leans gather on ±x, that is a slab limitation (ADR 0024) affecting the stand trial and any read of the front
    view alone, recorded there. It is not fixed here.
- **What it invalidates, and the re-run order** (the reference plan's State):
  1. goldens (done with this change);
  2. the arch-magnitude ADR;
  3. Level 0, all species;
  4. gate c's simulated rows;
  5. Level 1 v7 (v6 is superseded).

  The existing fits stay as the "before".
