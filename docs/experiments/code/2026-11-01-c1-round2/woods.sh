#!/usr/bin/env bash
# C1 round 2: do the species' woods level off? mixedWood, beechWood, oakWood and birchWood as
# presets now stand (R5 on neighbours, planted per area, top 200), seeds 1–3, 300 seasons.
#   bash docs/experiments/code/2026-11-01-c1-round2/woods.sh runs/c1r2-woods
set -euo pipefail
out=${1:-runs/c1r2-woods}; bin=rust/target/release/treesim
mkdir -p "$out"
[ "${MODE:-}" = beech ] || for p in mixedWood beechWood oakWood birchWood; do for seed in 1 2 3; do echo "$p $seed"; done; done |
  xargs -P "${JOBS:-2}" -n 2 sh -c "[ -f $out/\$0-s\$1/metrics.csv ] || $bin --preset \$0 --seed \$1 --seasons 300 --quiet --out $out/\$0-s\$1 && echo \$0-s\$1 done >&2"
# Beech's own L_h (flora.ts gives none, so 60): the beech wood with beech at L_h 40 and 30.
#   MODE=beech bash docs/experiments/code/2026-11-01-c1-round2/woods.sh runs/c1r2-woods
if [ "${MODE:-}" = beech ]; then
  for lh in 40 30; do for seed in 1 2 3; do echo "$lh $seed"; done; done |
    xargs -P "${JOBS:-3}" -n 2 sh -c "[ -f $out/beechWood-lh\$0-s\$1/metrics.csv ] || $bin --preset beechWood --seed \$1 --seasons 300 --species-patch '{\"beech\":{\"r1\":{\"Lh\":'\$0'}}}' --quiet --out $out/beechWood-lh\$0-s\$1 && echo beech lh\$0 s\$1 done >&2"
fi
