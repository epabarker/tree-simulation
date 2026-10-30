#!/usr/bin/env bash
# Form step 1 (docs/plans/2026-10-30-form.md §2): the scar fix with and without the rescale.
#   bash docs/experiments/code/2026-10-30-form/rescale.sh runs/form
# Both variants run on this commit's build, whose scars record the pipe radius:
#   base: the old girth scale (r0 0.02, m_w 1; the oak's fitted r0 0.02259);
#   k8:   the new defaults (r0 0.0025, m_w 64; the oak's 0.002824).
# Each at τ 0.2 (the presets' faces) and τ 0 (faces [0, 0]), seeds 1–3, 300 seasons, snapshots
# 150, 200, 300 with --light.
# forest/: `forest` plants no species, so --params reaches its trees.
# lone/:   `oakOpen`'s tree is the species oak, so its girth goes through --species-patch (§0.6).
set -euo pipefail
out=${1:-runs/form}
bin=rust/target/release/treesim
J=${JOBS:-12}
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml
mkdir -p "$out"/{forest,lone}
declare -A G=([base]='"c6":{"r0":0.02},"r1":{"mw":1},' [k8]='')
declare -A SP=([base]='{"oak":{"c6":{"r0":0.02259},"r1":{"mw":1}}}' [k8]='{}')
declare -A T=([t02]='' [t0]='"world":{"faces":[0,0]},')
jobs=()
for v in base k8; do for t in t02 t0; do for s in 1 2 3; do
  echo "{${G[$v]}${T[$t]}\"seed\":$s}" > "$out/forest/$v-$t-s$s.json"
  echo "{${T[$t]}\"seed\":$s}" > "$out/lone/$v-$t-s$s.json"
  jobs+=("forest $v-$t-s$s" "lone $v-$t-s$s")
done; done; done
export out bin
export SP_base="${SP[base]}" SP_k8="${SP[k8]}"
printf '%s\n' "${jobs[@]}" | xargs -P "$J" -L1 bash -c '
  declare -A SP=([base]="$SP_base" [k8]="$SP_k8"); group=$0 name=$1 v=${1%%-*}; dir="$out/$group/$name"
  [ -f "$dir/metrics.csv" ] && exit 0
  if [ "$group" = forest ]; then
    $bin --preset forest --seasons 300 --snapshots 150,200 --light --params "$dir.json" --quiet --out "$dir"
  else
    $bin --preset oakOpen --seasons 300 --snapshots 150,200 --light --params "$dir.json" \
      --species-patch "${SP[$v]}" --quiet --out "$dir"
  fi'
