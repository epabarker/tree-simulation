#!/bin/bash
# plan1.sh : the lifespan-off candidate's evidence, one stage after another (4 sims at a time).
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
LOFF='{"beech":{"r6.lifespan":1000}}'
# 1. the layered wood, seeds 13-40 (13-20 complete the 20-seed count; 21-40 are fresh)
SPPATCH="$LOFF" $D/batch.sh life1000 13-40 150; rm -f $D/runs/life1000-s*/run/metamers.csv
SPPATCH='' $D/batch.sh base 13-40 150; rm -f $D/runs/base-s*/run/metamers.csv
# 2. instrumented causes, seeds 1-4
seq 1 4 | xargs -P 4 -I{} env SPPATCH= $D/ilw.sh base {}
seq 1 4 | xargs -P 4 -I{} env SPPATCH="$LOFF" $D/ilw.sh loff {}
echo stage2
# 3. lone beech, seeds 1-10
$D/lone.sh base 1-10 '{}'
$D/lone.sh loff 1-10 '{"r6.lifespan":1000}'
echo stage3
# 4. the closed stand, seeds 1-20
SPPATCH='' $D/stand.sh base 1-20
SPPATCH="$LOFF" $D/stand.sh loff 1-20
echo plan1-finished
