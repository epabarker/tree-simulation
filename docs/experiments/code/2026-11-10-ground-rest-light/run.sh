#!/usr/bin/env bash
# Issue #104's evidence: lone open-grown trees (openLoneParams) before and after the fix, seeds 1–20,
# in WASM, 10 at a time (STATUS: cap 12 simulators). "Before" is a worktree at the fix's parent
# with its own WASM build (git worktree add <base> ba004d1; link node_modules; npm run build:wasm).
#   run.sh <base worktree> <fixed checkout> <out dir>
set -euo pipefail
base=$1 fix=$2 out=$3
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out/ll" "$out/fw"
jobs=()
for spec in holly:120:20,40 beech:240:30,60,100 oak:240:30,60,100; do
  IFS=: read -r sp box at <<<"$spec"
  for seed in $(seq 1 20); do
    jobs+=("$base $sp $seed $box $at $out/ll/$sp-base-$seed.json")
    jobs+=("$fix $sp $seed $box $at $out/ll/$sp-fix-$seed.json")
  done
done
printf '%s\n' "${jobs[@]}" | xargs -P 10 -L 1 node "$here/lowlimb.ts"
python3 "$here/summary.py" "$out/ll"
# The resting buds themselves, followed season to season, 40 seasons.
fw=()
for spec in holly:120 beech:240 oak:240; do
  IFS=: read -r sp box <<<"$spec"
  for seed in $(seq 1 20); do
    fw+=("$base $sp $seed $box 40 $out/fw/$sp-base-$seed.json")
    fw+=("$fix $sp $seed $box 40 $out/fw/$sp-fix-$seed.json")
  done
done
printf '%s\n' "${fw[@]}" | xargs -P 10 -L 1 node "$here/follow.ts"
python3 "$here/follow_summary.py" "$out/fw"
