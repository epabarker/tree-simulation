# I3, the remaining steps: the worker's season cost, reduced motion and first paint, the phone (brief, 2026-11-02)

A brief for a fresh track C session (renderer and page; `src/web/`, `src/wasm/`, `cli/`, and `rust/core/src/snapshot.rs`, `metrics.rs` where step 3 needs them). The I3 plan is [`2026-10-30-i3.md`](2026-10-30-i3.md); its steps 1, 2 and 4 are done (the picture in depth, the plate and recruits, the foliage instrument and knobs: PR #28 and `claude/foliage`). This brief is steps 3, 5 and 6 as the plan states them, with what has changed since, and it is the last work before the release.

## Where things stand
- `3d-port` carries round 2's beech (ADR 0039–0042, 0044), the measured bark, and once the user merges `claude/c1-calibration-ustbkz` the judging pass's overrides (oak held, holly's fork, rowan's held limbs, birch's and maple's picks). Branch from `3d-port` after that merge, as `claude/i3-remaining`.
- `claude/foliage` (track C) holds the renderer's view options (`clearBole`, `frame=height`, `girth`, `barkLight`, `woodContrast`) and birch's bark; it is merged, or about to be.
- The phone's numbers at I3 steps 1–2 (seed 10, 40 seasons): draw p95 6.3 ms, frame p95 16.8 ms, worker 50 ms a season. The budget is a 250 ms season on the phone's plate and no long frames through the tween at 60 Hz.
- **Known issue:** the 160-cell plate with the specimen beside it is 342.5 MB of WASM memory at 200 seasons against ADR 0026's 256 MB; the phone's 66-cell plate is 74.9 MB.

## Step 3: the season's cost on the worker (the plan's step 3)
1. Profile the snapshot (`snapshotMs` is reported): `tree_metrics` for every tree each season, including `ground_light` over each tree's x–z extent (`snapshot.rs`, `metrics.rs`). Measure at 66 and 160 cells, seasons 40 and 100, with the species as adopted.
2. If the metrics are most of it: a `SnapshotOptions.metrics: "every" | "lean"` where the garden asks for the full metrics every 4th season and a lean set (`tree`, `alive`, `height`, `species`, `sown`) otherwise; the lab keeps every season. Goldens and checkpoints unchanged (the snapshot is not hashed; check with `npm run bench -- --compare`).
3. **Expected:** the snapshot under 20 ms at 160 cells. **Stop if** the cost is the copy-out: then the column list is the lever (`light`, `resource`, `stress` only when the lab's colour mode asks), and say so.

## The memory problem (new since the plan)
1. Measure where the 342 MB is: the trees' tables (metamers × columns × 8 bytes), the light field, the snapshot's buffers, the WASM heap's growth pattern (`wasmMemoryBytes` under `?bench`), at 100 and 200 seasons on the 160-cell plate with and without the specimen.
2. Levers in order of cost: the specimen's own world sharing nothing it needs not; `compact` after shedding freeing capacity the `Vec`s keep; column types (an `i32` where an `f64` holds an id); the plate's cap. The core's data layout is AGENTS.md's invariant list: ask before changing a column's type or the checkpoint layout (a version and a reader, as ADR 0045 did and undid).
3. **Target:** under 256 MB at 200 seasons on the 160-cell plate with the specimen, or a measured case for raising ADR 0026's budget, put to the user with the numbers.

## Step 5: reduced motion and first paint (the plan's step 5)
1. Time `growStill` on the phone's plate with reduced motion on (the console's `seasonMs`; headless on the laptop first, the user's phone for the number that counts).
2. If the wait is over about 3 s: the picture. `cli/first-paint.ts` writes `first/<width>-<seed>.pic.gz` for widths ≤ 100, `garden.ts` draws it as the first snapshot while the worker regrows the seed and takes over at season 40; 300 kB gates it.
3. ADR 0028, "3D first paint: the live intro; a picture for reduced motion", with the plan's §1.1 and §1.3 and the decision. **Stop if** the regrown season 40 differs from the picture (a quantisation or a non-determinism: the picture waits).

## Step 6: the phone, and wrap-up (the plan's step 6)
1. `garden.html?bench&seasons=40` on the laptop headless and then on the user's phone over the LAN or a preview deploy (the user's): season ms, frame p95, draw p95, `wasmMemoryBytes`, at the phone's plate; the table beside the plan's §1.4 and steps 1–2's numbers, with the species as adopted.
2. **Stop if** the phone's season is over 250 ms (then recruits per area or the plate's share, before any lane work) or long frames show through the tween (then the leaf layout moves to the worker as snapshot columns).
3. Docs: the I3 note (`docs/experiments/2026-10-30-i3.md`, new sections), ADR 0028, ROADMAP's port entry, STATUS, devlog; `/wrap-up`; a PR into `3d-port`.

## Rules
- Renderer, page, worker and the snapshot only; no species, no principle, no golden change without the user. `npm run check` before any claim, with the dev server stopped (two slow tests time out beside it on the laptop).
- Everything numeric settled by the session; the user's time goes on the phone. Report to track E with the paths and one paragraph at each step's end.
- Never push to `main`; tags are the user's.
