#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
SLAB_DIR=${SLAB_DIR:-runs/slab}; mkdir -p $SLAB_DIR/runs
for c in forest wideForest; do
 for P in f64 f32; do
  for m in sweep fused; do
   for D in 1 4 16 32 64; do
    for K in 7 16 32; do
      o=$SLAB_DIR/runs/$c-$m-$D-$K-$P.json
      [ -f $o ] && continue
      node cli/bench.ts --case $c --repeat 1 --snapshot lean --slab $m:$D:$K:$P --out $o > /dev/null 2>&1 || echo FAIL $o
    done
   done
  done
  for D in 1 4 16 32 64; do
    o=$SLAB_DIR/runs/$c-pyramid-$D-0-$P.json
    [ -f $o ] && continue
    node cli/bench.ts --case $c --repeat 1 --snapshot lean --slab pyramid:$D:0:$P --out $o > /dev/null 2>&1 || echo FAIL $o
  done
 done
done
for c in forest wideForest; do for m in fused pyramid; do
  K=16; [ $m = pyramid ] && K=0
  o=$SLAB_DIR/runs/$c-$m-32-$K-f32-pz.json
  [ -f $o ] || node cli/bench.ts --case $c --repeat 1 --snapshot lean --slab $m:32:$K:f32:periodic --out $o > /dev/null 2>&1
done; done
echo DONE
