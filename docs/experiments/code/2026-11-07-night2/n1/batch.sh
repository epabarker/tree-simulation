#!/bin/bash
# batch.sh TAG SEEDS(e.g. 1-12) [SNAPS] : runs lw.sh over seeds, 4 at a time; env SPPATCH passes through.
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
lo=${2%-*}; hi=${2#*-}
seq $lo $hi | xargs -P ${JOBS:-4} -I{} $D/lw.sh $1 {} ${3:-150}
echo done $1
