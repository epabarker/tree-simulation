# Scratch code for the 3D-port measurement

Supports [the note](../../2026-10-29-3d-light-cost.md). Nothing here is part of the simulation.

| File | What it does |
|---|---|
| `../../../../cli/slab-light.ts` | The 3D light models and the `Shadowed` wrapper. `cli/bench.ts --slab` uses them |
| `grid.sh` | The 144-run TypeScript grid: cases × D × K × precision × kernel, plus the pyramid |
| `extra.sh` | `panorama`, the 2D baseline, native Rust threads, and TS against WASM |
| `agg.py` | Tables and linear fits from the grid's JSON |
| `check.ts` | Checks the slab march against the 2D row march, and fused against plain |
| `crowns.ts` | Canopy crown widths, to set D |
| `k2d.ts` | The 2D sweep's per-update cost on the dumped deposits |
| `kernels.ts` | The TS fused march against WASM scalar, SIMD and explicit f32x4, on one field |
| `rust/` | The fused march in Rust: `lib.rs` (generic, WASM exports, f32x4) and `main.rs` (native, threaded) |

## Rebuilding
Outputs go to `$SLAB_DIR`, by default `runs/slab`, which is not committed.

1. Dump a season's deposits:
   ```bash
   npm run bench -- --case forest --repeat 1 --snapshot lean \
     --slab fused:1:7:f64 --slabFrom 96 --slabEvery 100 \
     --dumpDeposits runs/slab/dep-forest.bin --out runs/slab/dump-forest.json
   ```
   Then the same with `wideForest`.
2. Build the WASM:
   ```bash
   cargo build --release --lib --target wasm32-unknown-unknown
   ```
   Copy the result to `$SLAB_DIR/slab-scalar.wasm`.
3. Build again with `RUSTFLAGS="-C target-feature=+simd128"` and copy that to `$SLAB_DIR/slab-simd.wasm`.
4. Build the native binary with `cargo build --release`.
5. Run `grid.sh`, then `extra.sh`, then `agg.py`.
