#!/usr/bin/env bash
# Form step 1b (the user's follow-up to step 1's stop): `forest` at k8 (this commit's defaults),
# seeds 1–3, 300 seasons, snapshots 150, 200 with --light, at τ 0.2 and τ 0:
#   nostorm: storms off (o2.stormP 0), the clean reading of the rescale;
#   sb9000:  storms on, R3's σ_break 4500 → 9000 (3 × σ_target 3000).
#   bash docs/experiments/code/2026-10-30-form/storms.sh runs/form
set -euo pipefail
out=${1:-runs/form}
bin=rust/target/release/treesim
J=${JOBS:-12}
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml
mkdir -p "$out/forest"
declare -A V=([nostorm]='"o2":{"stormP":0},' [sb9000]='"r3":{"sigmaBreak":9000},')
declare -A T=([t02]='' [t0]='"world":{"faces":[0,0]},')
for v in nostorm sb9000; do for t in t02 t0; do for s in 1 2 3; do
  echo "{${V[$v]}${T[$t]}\"seed\":$s}" > "$out/forest/$v-$t-s$s.json"
  echo "$v-$t-s$s"
done; done; done | xargs -P "$J" -I{} sh -c \
  "[ -f $out/forest/{}/metrics.csv ] || $bin --preset forest --seasons 300 --snapshots 150,200 --light --params $out/forest/{}.json --quiet --out $out/forest/{}"
