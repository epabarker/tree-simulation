#!/usr/bin/env bash
# Form step 4's slot (the user's row): `forest` at k8 with τ 0.1 (faces [0.1, 0.1]), seeds 1–3,
# 300 seasons, snapshots 100, 150, 200 with --light, beside rescale.sh's τ 0 and τ 0.2.
#   bash docs/experiments/code/2026-10-30-form/tau.sh runs/form3
set -euo pipefail
out=${1:-runs/form3}
bin=rust/target/release/treesim
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml
mkdir -p "$out/forest"
for s in 1 2 3; do
  echo "{\"world\":{\"faces\":[0.1,0.1]},\"seed\":$s}" > "$out/forest/k8-t01-s$s.json"
  echo "k8-t01-s$s"
done | xargs -P 3 -I{} sh -c \
  "[ -f $out/forest/{}/metrics.csv ] || $bin --preset forest --seasons 300 --snapshots 100,150,200 --light --params $out/forest/{}.json --quiet --out $out/forest/{}"
