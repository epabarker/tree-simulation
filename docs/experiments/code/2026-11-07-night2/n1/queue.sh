#!/bin/bash
# queue.sh SEEDS TAG1 PATCH1 [TAG2 PATCH2 ...] : runs candidate batches one after another (4 sims at a time).
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
seeds=$1; shift
while [ $# -ge 2 ]; do
  SPPATCH="$2" $D/batch.sh $1 $seeds 150
  rm -f $D/runs/$1-s*/run/metamers.csv
  shift 2
done
echo queue-finished
