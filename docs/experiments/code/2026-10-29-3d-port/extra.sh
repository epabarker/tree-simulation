#!/bin/bash
cd "$(git rev-parse --show-toplevel)"
SLAB_DIR=${SLAB_DIR:-runs/slab}; K=docs/experiments/code/2026-10-29-3d-port
# panorama at the chosen slab depth; 2D baselines; periodic-z sweep at K=7/32 for the slope
for P in f32 f64; do for D in 16 32; do
  o=$SLAB_DIR/runs/panorama-fused-$D-16-$P-pz.json; [ -f $o ] || node cli/bench.ts --case panorama --repeat 1 --snapshot lean --slab fused:$D:16:$P:periodic --out $o > /dev/null 2>&1
done; done
o=$SLAB_DIR/runs/panorama-pyramid-32-0-f32-pz.json; [ -f $o ] || node cli/bench.ts --case panorama --repeat 1 --snapshot lean --slab pyramid:32:0:f32:periodic --out $o > /dev/null 2>&1
node cli/bench.ts --case forest --case wideForest --case panorama --case coniferStand --repeat 3 --snapshot lean --out $SLAB_DIR/base2d.json > $SLAB_DIR/base2d.txt 2>&1
# native kernel: 1 and 4 threads, f32 and f64, libm and polynomial exp
for c in forest wideForest; do W=210; [ $c = wideForest ] && W=420
 for P in f32 f64; do for F in 0 1; do for T in 1 2 4; do
  echo "$c D=32 K=16 $P fast=$F threads=$T $($K/rust/target/release/native $SLAB_DIR/dep-$c.bin $W 130 32 16 1 0 $P $F $T 7)"
 done; done; done
done > $SLAB_DIR/native.txt
# wasm vs ts on the same field
for c in forest wideForest; do for D in 4 16 32 64; do for K in 7 16 32; do for P in f32 f64; do
  node $K/kernels.ts $c $D $K $P 5
done; done; done; done > $SLAB_DIR/kernels.jsonl
echo DONE
