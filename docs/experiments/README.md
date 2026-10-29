# Experiments

One note per experiment, named `YYYY-MM-DD-<milestone>-<topic>.md`. Use `/run-experiment` (`.claude/skills/run-experiment/SKILL.md`). Each note has:

1. **Question:** what we want to know, and the spec section it tests (§8 ablations and sweeps, §10 validation targets).
2. **Setup:** the exact command(s): preset, params patch, seeds, seasons. Anyone must be able to rerun it.
3. **Result:** numbers and one or two figures (small PNGs in `figures/`).
4. **Conclusion:** what it means for the model. Add follow-ups to STATUS or ROADMAP.

## Code that ran on the TypeScript core

The TypeScript core was deleted at I1 (ADR 0024). Scripts in `code/` written before then import `src/core/world.ts` and its siblings, and `cli/slab-light.ts`, `cli/run-ts.ts` and `npm run bench -- --slab` are gone. To rerun one, check out the tag `golden-2d-ts`, where all of them still run, and build the WASM there (`node cli/build-wasm.ts`); its `npm run sim -- --parity` reproduces the TypeScript core's runs bit for bit. Runs at HEAD are the Rust core's own and differ in the last bits, then more.

## Outside this repository: the site's `preview-3d` branch

The 3D port's preview pages (ADR 0024) live on a branch of the site, not here. That branch is `preview-3d` in `epabarker/edbarker-dev`, and Cloudflare Workers Builds serves it at `preview-3d-edbarker-dev.edbarker.workers.dev/preview/3d/`.
- **What it holds:** `public/_headers` with COOP/COEP for the whole site, plus built copies of three pages from `code/2026-10-29-g05-preview/`:
  - `index.html`, the G0.5 hosting check;
  - `kernel.html`, G1's light kernels;
  - `proto.html`, the prototype's and the τ runs' stands;
  - `g3.html`, G3's timing of the Rust slab sweep on three prototype stands (`g3/*.bin`);
  - `../i1/i1.html`, I1's goldens and seasons in each core, from `code/2026-10-29-i1/preview/` (built at the tag `golden-2d-ts`: it runs the TypeScript core beside the Rust one);
  - `../first/compare.html`, each opening forest as garden 0.14.0 shipped it beside the Rust core's, from `code/2026-10-30-first-paint/`.

  It is about **114 MB**, almost all of it baked stands (`proto/stands/*.json.gz`, `g3/`).
- **Never merge it.** It would put 108 MB of throwaway stands and site-wide COOP/COEP on production.
- **Rebuild it** from this repository, as the notes say: `bake.ts` and `run.ts` write the stands to `runs/`, then `vite build -c code/2026-10-29-g05-preview/vite.config.ts`. Copy the result to the branch's `public/preview/3d/`.
- **Delete it** when V (the visual check, ADR 0024) has been made on I2's stand, which replaces the prototype's. Delete it sooner if the user no longer wants to compare the τ stands on a phone. Nothing in this repository depends on it, and the hosting record it proved is in the G0.5 note. Its head when this was written was `d7d72c6`.
