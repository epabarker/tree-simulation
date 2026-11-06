#!/usr/bin/env bash
# Today's garden's forests for the preview's left panel: forestParams(width, 10) grown by the 2D
# core at the tag golden-2d-ts (its parity build: the TypeScript core's bytes, which garden 0.14.0
# opens), for 40 and 100 seasons, as <season>/<width>-10.bin.gz.
#   bash docs/experiments/code/2026-10-30-i2/bake-2d.sh <worktree at golden-2d-ts> <its parity treesim> <out>
set -euo pipefail
wt=$1; bin=$2; out=$3
for w in 66 160; do
  node --input-type=module -e "import { forestParams } from '$wt/src/core/presets.ts'; process.stdout.write(JSON.stringify(forestParams($w, 10)));" > "$out/params-2d-$w.json"
  for s in 40 100; do
    mkdir -p "$out/flat/$s"
    "$bin" --preset mixedWood --params "$out/params-2d-$w.json" --seasons $s --checkpoint-at $s --out "$out/run-2d-$w-$s" --quiet
    mv "$out/run-2d-$w-$s/checkpoint-$s.bin.gz" "$out/flat/$s/$w-10.bin.gz"
  done
done
