#!/usr/bin/env bash
# Build (a)'s evidence (#98, ADR 0062): the six exemplars alone in the built open box (beechOpen's
# preset, the tree swapped), seeds 1–20, 100 seasons, natively; metrics.csv carries budsOutside
# every season. 12 at once (STATUS: cap 12 simulators). Usage: run.sh <out> [seeds] [species]
# BOX=<cells> TOP=<cells> grow them in a larger box than the preset's (the reach measurement).
set -euo pipefail
out=${1:-runs/open-box-build}
seeds=${2:-$(seq -s, 1 20)}
species=${3:-oak,maple,birch,beech,hornbeam,holly}
bin=${TREESIM:-target/release/treesim}
mkdir -p "$out"
for sp in ${species//,/ }; do
  box=${BOX:-240}
  world=""
  [ -n "${BOX:-}" ] && world="\"world\":{\"width\":$box,\"depth\":$box,\"height\":${TOP:-200}},"
  echo "{$world\"trees\":[{\"x\":$((box / 2)),\"z\":$((box / 2)),\"species\":\"$sp\"}]}" > "$out/$sp.json"
done
jobs=()
for sp in ${species//,/ }; do
  for s in ${seeds//,/ }; do
    jobs+=("$sp $s")
  done
done
printf '%s\n' "${jobs[@]}" | xargs -P 12 -L 1 bash -c '
  sp=$0; s=$1; d='"$out"'/$sp-s$s
  [ -f "$d/hash.txt" ] && exit 0
  /usr/bin/time -f "%e s %M KB" -o "$d.time" '"$bin"' --preset beechOpen --seed "$s" --seasons 100 \
    --params '"$out"'/$sp.json --out "$d" >/dev/null
  echo "$sp s$s $(cat "$d.time")"'
