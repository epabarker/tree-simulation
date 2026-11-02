# Fresh look: make the beech read as a beech

You are one role in a small team of fresh-context agents working on a tree-growth simulator. You
have not seen the project's history, by design: the people who have are stuck. Read this brief,
the files it names, and nothing else outside your sandbox. Communicate only through the files
named under "The ledger".

## The project in one paragraph

A simulator in which tree form emerges from local rules, after Palubicki et al. (2009), "Self-
organizing tree models for image synthesis". Buds compete for light in a shared voxel field (a
slab 64 cells deep); resources flow to the best-lit shoots (Borchert–Honda); shaded shoots are
shed; girth follows the pipe model. Tier-2 rules add carbon balance (R1), physiological age and
axis differentiation (R2), mechanics with sag and posture (R3), dormancy and release (R4), shade
avoidance (R5) and short shoots (R6). The core is Rust (`rust/core/src`), driven from TypeScript
(`src/`), with the species as parameter patches (`src/core/flora-fitted.ts`, exported into
`rust/presets.json`). Trees are drawn as a flat frontal illustration on a phone, in a garden of
mixed British species on a personal website. `docs/spec.md` describes the rules; read it as
background, not as the answer. 1 cell ≈ 0.25 m; 1 season = 1 year.

## The goal

A visitor who knows British trees the way a walker does should be able to name the beech in the
garden's mixed wood at 40–100 seasons, on a phone, without a label. The picture is iconic, not
photographic: a field-guide silhouette with its identifying features clear beats realism.

The settings that are judged, in priority order:

1. **the lone tree at 60 and at 100** (160 cells wide, one tree): the dome is the main judge;
2. **the closed stand at 100** (84 cells wide, periodic sides, opaque faces, 12 trees in three rows
   of four; what the garden looks like inside): it must still read as a beech stand and must not
   break, so a lone dome that kills or deforms the stand is not a solution;
3. the garden plate at the phone viewport (not available in this harness; the solver checks it).

Seeds 1–3 are the judging seeds. Seeds 1001–1006 are held out: never run them.

## What a beech looks like (the target)

From the species identity card, `species-identity-beech.md` in this folder (sourced; [r] read in
the source, [s] abstract only, [u] field-guide memory):

- **Silhouette, open-grown:** a huge **dome**; mature open-grown trees are shorter (≈ 20 m) and
  broader than stand trees. **Not** a cone, **not** tiered: a beech with level tiers on a pointed
  cone reads as a young spruce, which is the current failure.
- **Scaffold:** Troll's model (*Fagus* type): all axes plagiotropic, the architecture built by their
  superposition; "young trees may develop a leader, aged crowns usually are polyarchic". Several
  steep, smooth limbs that **rise and then arch over**. Forks form at both extremes of vigour. Limbs
  of roughly equal thickness under a trunk that loses itself in the crown with age.
- **Twig habit:** flat, **level sprays** (distichous, a monolayer in shade, multilayer in sun), very
  fine and dense; at distance, level plates of foliage.
- **Foliage:** dense and **opaque**; leaves 4–10 cm; marcescent on saplings and low branches.
- **Bark and trunk:** **smooth pale grey into old age**. In a stand, a tall clean bole with the
  crown occupying about the top half (crown ratio ≈ 0.5, W/H 0.19–0.25 at ≈ 90 years), the limbs
  steep (≈ 30° from vertical in pure stands).
- **Ontogeny:** a layered cone when young [u], a dome when old.
- **What it is not:** not a spruce or fir (regular whorled tiers, a pointed top); not a hornbeam
  (smaller, finer, an egg on a fluted trunk).

## What it looks like today (the baseline)

`baseline/beech-today/sheet.png` and `baseline/beech-picks/sheet.png`, with `metrics.json` beside
each; the seeds are 1–3, the columns lone at 60 and 100 and the stand at 100, leaf-on and leaf-off.

- **Today (new rules off):** the lone tree is a tiered cone with a pointed top at 60 and a tall
  tiered column at 100 (it reaches the world's top at 200 cells, so its top there is the ceiling).
  The stand at 100 is bare poles (H/D ≈ 108) under a thin lid (crown ratio ≈ 0.36–0.41, floor
  4.3–4.8%, LAI ≈ 7).
- **With the picks** (three new rules the project has accepted on the lone tree: a sympodial relay,
  curvature along the relays, and limbs that level with age): the lone top is rounded and
  multi-stemmed, not yet a dome; the stand loses 3 or 4 of its 12 trees by 100, its boles go
  crooked, and its crown ratio drops to 0.2–0.34.

The current rules can make a spire, a tiered cone, a table or a vase, and that is all. Four rounds
of parameter fitting against literature targets did not change the kind of tree; sweeping the nine
existing form knobs did not either. Do not propose more fitting or more values in the existing
knobs. Treat the shedding rules' linear light response and the single bark ramp and uniform leaf
cards as untested suspects.

## Hard constraints

- **Emergence from local rules is the point.** A new growth rule with a botanical basis: yes. A
  renderer change for foliage, bark or texture: yes. An explicit crown envelope, a rule written for
  one species alone, or anything that draws the shape rather than grows it: no.
- **The ecology holds.** Shade-survival order, succession, stand floors and leaf area were put on
  measured values and are held out from this work. A proposal must keep the stand alive (≥ 10 of 12
  at 100), its floor between about 3 and 5%, its LAI near 7 and its H/D within about 70–110.
- **Keep the Hallé model**: beech is Troll. Argue for another only with a source.
- **New rules are switchable**, default off, so the goldens of every other species are unchanged.
- **Leave alone:** the RNG and its keyed hashing, the sky and light model, checkpoint bytes, the
  season order, the fit harness, the release pipeline, the site.
- **Phone budget:** a season under 250 ms and the worker under 256 MB (today 32–41 ms, 75 MB);
  the garden bundle has 4.7 kB of its 60 kB gzip budget left.
- **Never run seeds 1001–1006.**

## The harness

    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/render.py \
        --species beech --assign my-assigns.json --seeds 1,2,3 --out runs/fresh-look/<name> --label "..."

`--assign` is a JSON file of dotted paths into the species patch (`{"r2.levels.1.setPoint": 28}`);
`--patch` is a nested patch. Each candidate takes about a minute on two cores. The sheet is the
evidence; the metrics are the guard. Rebuild the native binary after a Rust change:
`cd rust && cargo build --release -p treesim` (RUSTUP_TOOLCHAIN=stable if the pinned channel is
unavailable).

## The ledger

All inter-agent context is on disk, in this folder:

- `task.md`: this brief (read-only).
- `notes.md`: the shared ledger. Headings for Proposal A, Proposal B, Proposal C, Solver decision,
  Review and Repair, each with a unique marker (`<!-- proposal-a -->` and so on). Ideators insert
  their proposal immediately before their own marker with a minimal edit; never rewrite the file or
  another section. Re-read and retry a minimal insertion if the file changed under you.
- `review-checklist.md`: what the reviewer scores (read it: it is what you are aiming at).
- `blind-test.md`: the naming test the reviewer runs.
- `baseline/`: today's sheets and metrics.

Each proposal must contain: the mechanism and its botanical basis (with the card's source tags);
exactly which rule, field or renderer path changes and how (file and function); pseudocode or the
patch; a prototype sheet from the harness (its path under `runs/fresh-look/`, and its metrics);
what it costs (per-season time, bundle size); what it risks for the ecology; and an honest line on
what it does not fix. If you prototyped nothing, say so and why.
