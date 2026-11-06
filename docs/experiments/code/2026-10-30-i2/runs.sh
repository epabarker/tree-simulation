#!/usr/bin/env bash
# I2's measurements: m and the passes' cost, 3D (this commit) against 2D (the tag golden-2d-ts,
# built with 2d-bench-series.patch for the same per-season series), single-threaded, natively.
#   bash docs/experiments/code/2026-10-30-i2/runs.sh runs/i2 rust/target/release/treesim rust/target/twod/release/treesim
set -euo pipefail
out=${1:-runs/i2}; three=${2:-rust/target/release/treesim}; two=${3:-rust/target/twod/release/treesim}
mkdir -p "$out"
# The prototype's rules (C1–C6, R1, R6; R2–R5, mechanics and stand dynamics off), and the full model.
PROTO='{"r3":{"enabled":false},"r4":{"enabled":false},"r5":{"enabled":false},"o2":{"stormP":0},"o4":{"enabled":false}}'
FULL='{}'
for rules in proto full; do
  patch=$PROTO; [ $rules = full ] && patch=$FULL
  echo "$patch" | "$two" --preset forest --seasons 100 --params - --bench > "$out/2d-$rules.json"
  for look in interior edge hedgerow fade; do
    case $look in
      interior) w='{"faces":[0.2,0.2]}' ;;
      edge) w='{"faces":[1,0.2]}' ;;
      hedgerow) w='{"faces":[1,1]}' ;;
      fade) w='{"faces":[0.2,0.2],"fade":3}' ;;
    esac
    p=$(python3 -c "import json,sys;a=json.loads(sys.argv[1]);a['world']={**{'width':210,'height':130,'walls':[],'sides':'periodic','depth':64},**json.loads(sys.argv[2])};print(json.dumps(a))" "$patch" "$w")
    echo "$p" | "$three" --preset forest --seasons 100 --params - --bench > "$out/3d-$rules-$look.json"
    echo "$rules $look done" >&2
  done
done
