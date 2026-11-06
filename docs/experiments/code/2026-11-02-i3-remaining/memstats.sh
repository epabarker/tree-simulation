#!/usr/bin/env bash
# Builds memstats/ (tree-core under a counting allocator) for wasm32 into $1 (a scratch folder):
# $1/pkg/memstats.js and memstats_bg.wasm, for memory-split.ts. The same flags as the product build.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
out="$1"
cp "$here/../../../../rust/Cargo.lock" "$here/memstats/Cargo.lock"
RUSTFLAGS="-C target-feature=+simd128" cargo build --quiet --release --offline \
  --target wasm32-unknown-unknown --manifest-path "$here/memstats/Cargo.toml" --target-dir "$out/target"
wasm-bindgen --target web --out-dir "$out/pkg" --out-name memstats \
  "$out/target/wasm32-unknown-unknown/release/memstats.wasm"
rm -f "$here/memstats/Cargo.lock"
