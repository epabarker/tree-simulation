#!/usr/bin/env bash
# Form step 1c (the user's second follow-up): windthrow's ramp starts at H/D 80 (r3.rs, ADR 0027);
# `forest` at k8 with storms on and R3's σ_break 6000, 7000, 8000 (2–2.67 × σ_target 3000), at
# τ 0.2 and τ 0, seeds 1–3, 300 seasons, snapshots 150, 200 with --light.
#   bash docs/experiments/code/2026-10-30-form/sigma-break.sh runs/form
set -euo pipefail
out=${1:-runs/form}
bin=rust/target/release/treesim
J=${JOBS:-12}
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml
mkdir -p "$out/forest"
declare -A T=([t02]='' [t0]='"world":{"faces":[0,0]},')
for sb in 6000 7000 8000; do for t in t02 t0; do for s in 1 2 3; do
  echo "{\"r3\":{\"sigmaBreak\":$sb},${T[$t]}\"seed\":$s}" > "$out/forest/sb$sb-$t-s$s.json"
  echo "sb$sb-$t-s$s"
done; done; done | xargs -P "$J" -I{} sh -c \
  "[ -f $out/forest/{}/metrics.csv ] || $bin --preset forest --seasons 300 --snapshots 150,200 --light --params $out/forest/{}.json --quiet --out $out/forest/{}"
