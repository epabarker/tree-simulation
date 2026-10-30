#!/usr/bin/env bash
# Form step 1c: the mixed wood with windthrow's new ramp and R3's σ_break at the chosen value
# (the species carry their own r3 blocks, so σ_break goes to the world and to every species).
# seeds 1–3, 300 seasons, snapshots 150, 200, τ 0.2 (the preset's faces).
#   bash docs/experiments/code/2026-10-30-form/mixed.sh runs/form 7000
set -euo pipefail
out=${1:-runs/form}
sb=${2:?σ_break}
bin=rust/target/release/treesim
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml
mkdir -p "$out/mixed"
sp=$(python3 -c "import json,sys;print(json.dumps({s:{'r3':{'sigmaBreak':int(sys.argv[1])}} for s in 'birch beech oak fir hornbeam maple holly rowan willow pine'.split()}))" "$sb")
for s in 1 2 3; do
  echo "{\"r3\":{\"sigmaBreak\":$sb},\"seed\":$s}" > "$out/mixed/sb$sb-s$s.json"
  echo "sb$sb-s$s"
done | xargs -P 3 -I{} sh -c \
  "[ -f $out/mixed/{}/metrics.csv ] || $bin --preset mixedWood --seasons 300 --snapshots 150,200 --params $out/mixed/{}.json --species-patch '$sp' --quiet --out $out/mixed/{}"
