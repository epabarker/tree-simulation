# I3 planning measurements (2026-10-30)

For [the plan](../../../plans/2026-10-30-i3.md) §1. Node 24 (`.ts` run directly), the built WASM (`npm run build:wasm`), and for `bench.mjs` a `vite preview` of `npm run build` on port 4173 plus Playwright's Chromium.

- `sizes.ts`: the garden's planting at 66, 160 and 200 cells, seasons 40 and 100: metamers, snapshot bytes and time, season time in one lane, WASM memory, and the picture's leaf coverage (the τ note's measure). Output `sizes.txt`.
- `picture.ts`: what a quantised first-paint picture of the season-40 snapshot would weigh, gzipped, against the raw snapshot and the checkpoint. Output `picture.txt`.
- `bench.mjs`: the page's `?bench` through the intro in headless Chromium (software GL): the garden at a phone's and a laptop's viewport, the lab on `mixedWood` with WebGL2 and Canvas 2D, and `forest`. Output `bench.txt`. Draw times under software GL are relative, not the phone's.
- The checkpoint sizes came from `treesim --preset mixedWood --seed 10 --seasons 40 --checkpoint-at 40` (and 100).
