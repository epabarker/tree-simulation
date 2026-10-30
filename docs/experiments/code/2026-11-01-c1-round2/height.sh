#!/usr/bin/env bash
# C1 round 2, step 1: R1's height plateau. A lone tree and `forest` (R5 sensing neighbours, the
# woods' top at 200, D = 64, the interior's τ), seeds 1–3, 300 seasons; R1's L_h, m_w and m_f
# moved one at a time, then combined. Writes metrics.csv per run (height against season).
#   bash docs/experiments/code/2026-11-01-c1-round2/height.sh runs/c1r2 [variant…]
set -euo pipefail
out=${1:-runs/c1r2}; shift || true
bin=rust/target/release/treesim
SEASONS=${SEASONS:-300}
STAND='"world":{"width":210,"height":200,"walls":[],"sides":"periodic","depth":64,"faces":[0.2,0.2]}'
LONE='"world":{"width":210,"height":200,"walls":[],"sides":"open","depth":64,"faces":[0.2,0.2]},"trees":[{"x":105}],"o4":{"enabled":false}'
R5='"r5":{"signal":"neighbours"}'
declare -A K=(
  [r1]='"r1":{}'
  [lh40]='"r1":{"Lh":40}'
  [lh30]='"r1":{"Lh":30}'
  [lh20]='"r1":{"Lh":20}'
  [mw2]='"r1":{"mw":2}'
  [mw4]='"r1":{"mw":4}'
  [mw8]='"r1":{"mw":8}'
  [mf012]='"r1":{"mf":0.12}'
  [mf02]='"r1":{"mf":0.2}'
)
for extra in ${EXTRA:-}; do K[${extra%%=*}]=${extra#*=}; done
names=("$@"); [ ${#names[@]} -eq 0 ] && names=("${!K[@]}")
mkdir -p "$out"
for k in "${names[@]}"; do for where in lone stand; do for seed in 1 2 3; do
  w=$STAND; [ $where = lone ] && w=$LONE
  echo "{$w,$R5,${K[$k]},\"seed\":$seed}" > "$out/$where-$k-s$seed.json"
  echo "$where-$k-s$seed"
done; done; done | xargs -P "${JOBS:-4}" -I{} sh -c \
  "[ -f $out/{}/metrics.csv ] || $bin --preset forest --seasons $SEASONS --params $out/{}.json --quiet --out $out/{} && echo {} done >&2"
