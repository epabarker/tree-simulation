#!/usr/bin/env bash
# Pre-C1 item 5: does the world's top bind? `forest` (full model, wood interior, D = 64) with the
# top at 130 cells (today) and 200, seeds 1–3, 150 seasons, natively, one thread.
#   bash docs/experiments/code/2026-10-31-pre-c1/ceiling.sh runs/ceiling
set -euo pipefail
out=${1:-runs/ceiling}; bin=${2:-rust/target/release/treesim}
mkdir -p "$out"
for h in 130 200; do
  for seed in 1 2 3; do
    p="{\"seed\":$seed,\"world\":{\"width\":210,\"height\":$h,\"walls\":[],\"sides\":\"periodic\",\"depth\":64,\"faces\":[0.2,0.2]}}"
    echo "$p" | "$bin" --preset forest --seasons 150 --params - --out "$out/h$h-s$seed" > /dev/null
    echo "$p" | "$bin" --preset forest --seasons 150 --params - --bench > "$out/h$h-s$seed.bench.json"
    echo "h$h seed $seed done" >&2
  done
done
