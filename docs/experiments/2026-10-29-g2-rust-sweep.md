# 3D port, G2: the 2D sky sweep in Rust, bit-identical to every golden

## Question
G2 is the first gate of the Rust core ([ADR 0024](../decisions/0024-3d-slab-port.md)). The user's brief (2026-10-29):
- the Rust 2D sky sweep behind `LightModel`, in Float64 scalar code;
- bit-identical to every golden;
- the toolchain in CI and in `npm run check`;
- the thin wasm-bindgen wrapper crate kept separate from the core crate; threads behind a feature; nothing wasm-only in the core.

Report:
1. the `.wasm` size against the after-first-paint loading plan;
2. whether `sin`, `cos`, `atan2`, `pow` and `hypot` match V8 bit for bit. If any does not, port the fdlibm routine rather than re-hash.

## Setup
**Code:** this branch at 3d3032f; Node 24.22.2 (V8 13.6.233.17); Rust 1.97.0; wasm-bindgen 0.2.129; headless Chromium 153; the same 4-core VM as the other notes.

**The crates** (`rust/`):
- `tree-core`: dependency-free. It holds `light/sky_sweep.rs`, a port of `sky-sweep.ts` operation for operation (rows and columns, open and ring, rotation, walls), and `math/`, the JavaScript `Math` the sweep needs. The `threads` feature is native-only: directions are swept in parallel, each into its own buffer, and summed in direction order.
- `tree-wasm`: the wasm-bindgen wrapper, holding only the boundary.

**The TypeScript side:**
- `src/wasm/` loads the module and implements `LightModel` on it.
- The core gains `setSkySweepFactory` (a hook; it never loads WASM) and an optional `LightModel.dispose()`.
- `npm run sim -- --rust` and `npm run bench -- --rust` switch to it.

```bash
npm run check                                   # builds the WASM, runs rust:check (fmt, clippy, tests), lint, typecheck, vitest
npm run bench -- --case forest --rust           # and without --rust; also skyStand, panorama
node docs/experiments/code/2026-10-29-g2/micro.ts forest 60     # compute, deposits, samples, interleaved
npx vite build -c docs/experiments/code/2026-10-29-g2/vite.config.ts   # the browser check, served from runs/g2-browser
```

The math probe was a scratch harness. `gen.mjs` wrote 1M inputs per function with V8's outputs, then a second adversarial million:
- special values;
- results near overflow and underflow;
- subnormal bases;
- negative bases with integer exponents;
- sin and cos within 64 ulps of k·π/2, and at huge arguments.

A native Rust binary compared each candidate bit for bit. The same comparison now runs in vitest on the WASM build (`tests/wasm-math.test.ts`, 100k per function).

## Result

### 1. Bit-identical
| Check | Result |
|---|---|
| Every golden with the sweep in Rust (`tests/golden-rust.test.ts`) | **27 / 27** equal to `tests/golden.json` |
| Bench hashes with `--rust` | `forest` 3cfd7ec9, `skyStand` 0097d226, `panorama` d9aadbde: the TypeScript ones |
| `npm run sim -- --preset forest --seasons 60 --rust` | hash 7d029768, as without `--rust` |
| Field parity (`tests/wasm-sky.test.ts`): both sweeps in one world; ℓ, Q, V_x, V_y compared after every compute, and every sample | equal on 10 configurations: skyStand, skyTree, overcast (p 1.5), obliqueSun (tilt), forest (ring), two with rotating directions, two with the M6 column sweep (open; ring with laps), and walls and a roof including one above the grid |
| Native fixture (`rust/core/tests/sweep_fixture.rs`) against hashes from the TypeScript sweep | equal for rows and columns, open and ring, **with and without `threads`** |
| Sensitivity: a one-bit error planted in the Rust exp | caught by all 10 parity cases and the math test |

The goldens alone would not have been enough. Every preset has `c2.rotate` off, so they compute the sky directions (sin, cos, pow) only once per world. The parity test covers rotation and the column sweep, which no golden uses.

### 2. Math: what V8 computes, and the port

| Function | What Node's V8 computes | `libm` crate (musl/fdlibm, wasm32's `std`) | Native `std` (glibc) | The port in `tree-core` | Mismatches, 1M random + 1M adversarial |
|---|---|---|---|---|---|
| `sin`, `cos` | fdlibm (`v8/src/base/ieee754.cc`): Node's gyp build leaves `V8_USE_LIBM_TRIG_FUNCTIONS` off | 0.89%, 0.87% | 3.2% | **V8's fdlibm, ported** | **0, 0** |
| `exp` | fdlibm | 0 | 8.8% | V8's fdlibm, ported (vendored, not the crate) | **0** |
| `pow` | **not fdlibm**: `math::pow` handles NaN, ±1^±∞, y = 2 and y = ½, then calls the C library's `std::pow` (flag `use_std_math_pow`, default on). On glibc 2.39 x86-64 that is the FMA variant of Arm's optimized-routines pow | 9.1% | 0 (same glibc) | **glibc's pow, ported:** Arm's code and tables (MIT), with the three explicit `fma`s and the fusions GCC makes under `-mfma -ffp-contract=fast` | **0** |
| `hypot` | V8's own Torque fast path for two arguments: √((a/m)² + (b/m)²)·m, m = max | 26% | 25% | **V8's formula, ported** | **0** |
| `atan2` | fdlibm | 219 in 1M, all at extreme exponents | 13% | not needed by the sweep; **I1 ports V8's** | — |
| `sqrt`, `floor` | exact | 0 | 0 | Rust's own | 0 |
| For I1: `tan`, `asin`, `acos`, `atan`, `expm1` | fdlibm | 0 | 0.02–7.6% | — | — |
| For I1: `log`, `log1p`, `tanh`, `cbrt` | fdlibm | 1.2%, 0.04%, 3.7%, 8.4% | 0.04–8.4% | — | — |

- **pow took two attempts.** The first port fused every product that only feeds additions; it missed 7 in 1M, all in glibc's `specialcase` (results far from 1). GCC does not fuse a product that is also used in another basic block (`scale·tmp`, reused inside the `if`), so the port must not either. With that, 0 in 2M.
- **The port matches Node on x86-64 Linux, where the goldens are made, and gives those bits on every target** (native and wasm32, in any browser). That is a property the TypeScript core does not have (§3).

### 3. The same goldens in a browser (headless Chromium 153, Linux x86-64)

| | Goldens equal to `tests/golden.json` |
|---|---|
| TypeScript core | **7 / 27** (explosion ×2, shadow ×2, bh, leader, spreading) |
| Sweep in Rust, the rest TypeScript | **7 / 27** (the same seven) |

`Math` in Chromium against the Rust core (which is Node's V8), 200k samples each:

| Function | Mismatches |
|---|---|
| `sin` | 3.4% |
| `cos` | 3.4% |
| `exp` | 9.8% |
| `pow` | 0 |
| `hypot` | 0 |

- **Chrome builds V8 with glibc's trig** (`v8_use_libm_trig_functions = is_clang`), and its `exp` differs from Node's as well.
- **`pow` matches here only because Chromium on Linux calls the same glibc.** On Android it is bionic's, on a Mac Apple's.
- **So today a seed grown by the CLI is not the forest a Chrome visitor grows,** and 20 of the 27 goldens fail in the browser. Phone against laptop, or Chrome against Firefox, can differ too.
- **G2 cannot change this:** the rest of the core still calls the browser's `Math`. **I1 can,** once the whole core runs on the vendored math.

### 4. Size (`src/wasm/pkg/`, release, `lto`, `panic = "abort"`, names stripped)

| | Raw | gzip |
|---|---|---|
| `core_bg.wasm` | **50.0 kB** | **23.8 kB** |
| `core.js` (wasm-bindgen glue) | 8.9 kB | 2.3 kB |

Where the bytes go (twiggy, before stripping names):

| Part | Share |
|---|---|
| Tables (`.rodata`) | 14% |
| `compute` | 11% |
| fdlibm's `rem_pio2` (Payne–Hanek, large arguments) | 10% |
| Function names (now stripped) | 9% |
| The `dlmalloc` allocator | 13% |
| Panic formatting | ≈ 6% |
| Software `fma` | 2% |
| The rest | the remainder |

**Against the loading plan** (ADR 0024: the WASM loads after first paint, outside ADR 0014's 60 kB first-paint budget, with its own gate set at I1 as measured size plus 25%):
- G2's module is **26 kB gzip**, about 0.2 s on a slow 4G link, fetched after the first frame.
- Nothing here touches the first-paint budget: the garden does not load it yet (§6).
- **What I1 will add:** the passes are mostly loops over typed arrays; the `Math` left to port is listed in §2. The allocator and panic machinery are paid once already.

### 5. Speed (Float64 scalar, as asked)

**Per season, bench medians** (100 seasons, best of 3; ms):

| Case | Light, TS | Light, Rust | Sample, TS | Sample, Rust | Season, TS | Season, Rust |
|---|---|---|---|---|---|---|
| `forest` | 2.27 | 3.05 | 0.41 | 0.54 | 4.57 | 5.70 |
| `skyStand` | 2.67 | 3.37 | 0.59 | 0.72 | 5.66 | 6.81 |
| `panorama` | 8.74 | 9.89 | 2.47 | 2.86 | 16.7 | 18.5 |

**Where it goes** (`micro.ts`, `forest` at season 60 with 942 deposits, 15 interleaved rounds; ms):

| | compute | deposits | samples |
|---|---|---|---|
| TypeScript | 2.61 | 0.012 | 0.069 |
| Rust in WASM | 3.51 | 0.022 | 0.083 |
| Rust in WASM, exp replaced by a stand-in (timing only) | 1.23 | | |

- **The row march itself is about 2× faster in WASM; exp makes the whole 1.35× slower.** The sweep takes ≈ 130k exps a season on `forest`.
  - **TypeScript's `Math.exp`** is a call into V8's fdlibm compiled natively for x86-64.
  - **The Rust core's** is the same fdlibm compiled to WASM: ≈ 18 ns a call, against 8.2 ns for the same code natively (glibc's exp: 6.2).
- **The boundary is cheap:** deposits and samples cross it for 0.01–0.02 ms a season.
- **Bit-identity forces this.** A faster exp (Float32, polynomial, SIMD) changes the bits, so it waits until the TypeScript core is gone (after I1). The 3D light is not bound to it: G1's kernels use Float32 and their own exp.

### 6. Toolchain
- **`rust-toolchain.toml`** pins Rust 1.97.0 with the wasm32 target, rustfmt and clippy; rustup installs them on first use.
- **`cli/build-wasm.ts`** checks that wasm-bindgen-cli is the exact version `rust/Cargo.lock` pins, and says how to install it if not.
- **`npm run check`** now runs:
  1. `build:wasm`;
  2. `rust:check` (fmt, clippy `-D warnings` with and without `threads`, the Rust tests both ways);
  3. lint, typecheck (including `src/wasm`) and vitest.

  That is 40 files and 283 tests, against 240 tests before.
- **CI and release** get the toolchain from `.github/actions/rust`, which caches cargo and `rust/target`, installs the toolchain and installs `wasm-bindgen-cli` at the pinned version.
  - The workflows run only on pull requests and `main`, so **this push has not yet run them.** The first run compiles wasm-bindgen-cli, about 2–3 min; later runs are cached.
- **Here,** GitHub release downloads are blocked, so wasm-bindgen-cli was built from crates.io.

## Conclusion
- **G2 passes:**
  - the Rust sweep reproduces every golden and every field bit for bit, with threads too;
  - its `Math` matches V8's on 4M adversarial and random samples;
  - the module is 24 kB gzip, loaded after first paint;
  - the toolchain is in `check` and in CI.
- **Of the five functions asked about, sin, cos and hypot needed ports, and pow needed glibc's, not fdlibm's** (V8 calls the C library). atan2 is not used by the sweep and is I1's (§2).
- **The TypeScript core is not deterministic across engines:** in Chromium only 7 of 27 goldens hold. Only the whole Rust core (I1) fixes that.
- **Bit-identical Rust is not faster here:** the light is 1.35× slower in WASM because of exp, while the march is 2× faster. The review's "Rust ≈ 1.6× on the passes" is unmeasured until I1. The light cannot get faster while it must match V8.
- **What would have stopped G2:**
  - **a `Math` routine whose bits could not be reproduced.** pow came closest: V8 delegates it to the C library, so its bits depend on glibc's version, its FMA variant and GCC's contraction rules, and the first port missed 7 in 1M;
  - **any reordering for speed** (SIMD, a faster exp), which would have meant re-hashing.

  Neither happened. **The fragility pow exposes is in the TypeScript goldens, not the port:** a CI runner with another glibc or without FMA would fail the TypeScript goldens, while the Rust core gives the same bits anywhere.
