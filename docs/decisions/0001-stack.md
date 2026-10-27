# 0001: Technology stack

- **Status:** accepted
- **Date:** 2026-10-26
- **Spec:** §5 (data layout), §6 (season loop), §7 (milestones), §8 (experiments)
- **Background:** `docs/background/stack-brief.md`

## Context

The simulation has several requirements:
- It runs on a static personal website, smoothly on mid-range phones.
- It never stutters the UI while computing.
- It also runs headless for sweeps and ablations analysed in Python or R.
- It has one implementation.

The user knows Python and R best, and is willing to learn a language that is useful beyond this project.

**Cost estimates** (back-of-envelope, not measurements):
- **Per season:** a 10-tree stand of about 30k metamers needs about 6 linear passes, roughly 2 ms in JIT-compiled JavaScript over typed arrays. A K = 9 sky sweep over a 1000×250 grid is about 2M multiply-adds, roughly 5 ms if exp is taken only at buds.
- **Per run:** about 1 s for 100 seasons. A 1,000-run sweep takes minutes on 8 cores.
- **Browser headroom:** played at a few seasons per second, the worker has a 10–20× margin.
- **Where the cost really is:** rendering about 60k shapes per frame on a phone, not the simulation.

**First measurement.** M0 takes about 16 ms per season at 32k metamers in Node 24, before any optimisation.

## Decision

| Layer | Prototype (M0–M5) | Finished |
|---|---|---|
| Simulation core | TypeScript, SoA typed arrays, no DOM or Node | Same; hot kernels move to Rust/WASM only if a trigger below fires |
| Off main thread | Web Worker plus Comlink; snapshots as transferable buffers | Same |
| Rendering | Canvas 2D, with segments batched by (colour, width) | WebGL2 via twgl.js: instanced quads, fragment-shader tapered capsules (SDF), the light grid as a texture for shading and heatmaps |
| Controls | Tweakpane bound to one plain-JSON params object | Tweakpane, plus a hand-written play bar and preset buttons |
| Charts | Observable Plot, loaded after the first frame | Same, or uPlot if bundle size matters |
| Build and test | Vite, Vitest, Biome, strict TypeScript (`erasableSyntaxOnly`) | Same, with golden-hash CI |
| Deploy | Static `dist/` to GitHub Pages | Same, or a subfolder of the personal site (`base: './'`) |
| Headless | Node 24 runs the same `.ts` core; the CLI writes CSV | Arrow IPC; Python (uv, polars, plotnine) and R (arrow) read it |

**Why TypeScript.**
- The browser speaks JavaScript; every other language needs a bridge. Python and R need multi-MB runtimes; Rust is a steep learning curve.
- One implementation runs in the worker, in Node and in tests.
- It reads like typed Python. Typed arrays are 1-D NumPy arrays where plain loops are fast.
- It carries over to the planned Neo4j knowledge-graph front end (sigma.js uses the same WebGL-instancing ideas).

**Why no SharedArrayBuffer.** It needs COOP/COEP headers, which GitHub Pages cannot send. At a few seasons per second, transferring buffers costs nothing.

**Rejected:**
- **Pyodide/PyScript and webR:** multi-MB downloads, slow start-up on phones, slow sequential loops.
- **Shiny, Streamlit and Dash:** compute on a server for every visitor, and no smooth on-device animation.
- **PixiJS:** this many tapered branches would still need a custom instanced mesh and shader, so it adds weight without removing the hard part.
- **Three.js:** a 3D engine for a 2D problem.
- **SVG:** one DOM node per segment.
- **The 2.5D parallax idea:** dropped by the user.

## Consequences

- Python cannot `import` the simulation. It runs the CLI and reads files (`analysis/sweep.py`).
- Reproducibility is exact on V8 only (ADR 0002).

**Triggers to revisit:**
- **Rust/WASM**, behind the same interface (each SoA column becomes a `Vec`, and the goldens verify the port), when any of these happens:
  - a season takes more than about 50 ms in the worker at the target stand size;
  - sweeps outgrow an overnight run;
  - in-process `import` from Python (PyO3) or R (extendr) is wanted.
- **WebGPU:** only for very large stands or GPU-side kinematics. The tree passes are sequential traversals, the light sweep is too small to beat dispatch and readback, and WebGL2 works on effectively every device.
- **WebGL2 renderer:** at M6, or earlier if Canvas 2D frame times on a phone exceed about 16 ms at the M5 stand size.

## Update 2026-10-27 (M6b)
The WebGL2 renderer is in, as planned (twgl.js 7; instanced SDF capsules and leaves; the light field as a texture), with Canvas 2D kept as the automatic fallback. First paint grew from about 39 kB to 60 kB gzipped (twgl.js does not tree-shake fully), still inside the 100 kB budget. Desktop measurements are in `docs/architecture.md`; a real-phone measurement is still to do.
