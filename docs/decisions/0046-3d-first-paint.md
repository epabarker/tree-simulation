# 0046: 3D first paint: the live intro; reduced motion draws the plate at once

- **Status:** accepted (2026-11-02, by track E for the user, on the laptop's numbers). The user's verdict on the phone is that the garden "works great"; the phone's reduced-motion wait was not read and is taken at the soak. The I3 plan named this ADR 0028, a number since taken by the species targets.
- **Date:** 2026-11-02
- **Spec:** ADR 0014 (the garden on the home page), M21 (first paint from checkpoints), M23 (the time-lapse intro), ADR 0025 (I2: first paint switched off)
- **Plan:** [I3](../plans/2026-10-30-i3.md) §1.1, §1.3, §2 decision 2, step 5; [the brief](../plans/2026-11-02-i3-remaining.md); [the note](../experiments/2026-10-30-i3.md), "Step 5"

## Context
In 2D the garden could open on a grown forest: a gzipped checkpoint of about 100 kB (M21, ADR 0014's 300 kB a checkpoint). In 3D that is out:
- **A checkpoint is 4–16 MB** gzipped (plan §1.1): every f64 column of the tables, which gzip barely touches.
- **A quantised picture of the season-40 snapshot** (positions to 1/16 cell, the other columns 8 or 16 bits, parents and buds as deltas) is 225 kB at 66 cells, 500 kB at 160 and 730 kB at 220 (§1.3). It can only be a first frame: the worker regrows the same seed behind it and takes over at season 40.

The intro self-paces (plan §0): a slower worker stretches it and never drops frames. So a visitor with motion needs nothing shipped.

A visitor with reduced motion gets no intro. The worker grows the 40 seasons in one call (`growStill`) and the page shows the forest still. Until I3 step 5 the page drew nothing until then, so garden.html stayed black, its heading dark on black, for the whole wait.

Measured with `garden.html?bench&seed=10` and reduced motion on, headless Chromium on the user's laptop, the dev server and a production build alike:
- the phone's plate (66 cells, 14.5k metamers): 1.1–1.2 s to the still forest, one load in five 2.4 s;
- the laptop's (160 cells, 35.1k): 4.8–5.1 s, one load 2.8–3.1 s.

## Decision
1. **The live intro for every visitor with motion; nothing shipped** (`cli/first-paint.ts`'s manifest lists no widths), as decided at I3's plan.
2. **Reduced motion draws the plate at once:** the sky, the ground and the seedlings of season 0. The worker grows the 40 seasons behind it, and the still forest replaces the plate when it arrives, without a tween (`garden.ts`: the frame loop starts before `growStill`). The wait reads as a page loading, not a broken one.
3. **No first-paint picture.** The plan's rule was a picture if the wait is over about 3 s. On the laptop the phone's plate is at 1.1 s, and the phone's own reading is taken at the soak. If the soak shows the phone over about 3 s, the picture is the follow-up, as the plan describes it: `first/<width>-<seed>.pic.gz` for widths ≤ 100, 300 kB a picture, drawn as the first snapshot while the worker regrows the seed, wider plates taking the nearest width at or under theirs. It would be accepted only if the regrown season 40 matches the picture within its quantisation.

## Consequences
- No format, writer or reader for a picture. The garden's `first` option stays for 2D checkpoints, unused in 3D.
- On a laptop the reduced-motion wait is 3–5 s, with the plate drawn throughout. If that is judged too long, the picture's 100-cell width is the remedy for wide plates too.
- `?bench` with reduced motion on reports the wait and the worker's share, so the soak's reading is one URL: `garden.html?bench&seed=10` with the phone's reduced motion on.
- **Revisit** if the core's season gets slower (the wait scales with it), or if the site's page wants a first frame before the worker's WASM has loaded.
