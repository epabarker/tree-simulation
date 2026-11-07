#!/bin/bash
# job.sh TAG SPECIES SEED PATCHJSON
R=/home/edbarker/Documents/Projects/tree-simulation; SW=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/sweep
o=$SW/res/$1__$3.json; [ -f $o ] && exit 0
mkdir -p $SW/res $SW/tmp; d=$SW/tmp/$1__$3.json
node $SW/dumpp.ts $R $2 $3 $d "$4" && cd $R && uv run -q --project analysis python -I $SW/measure.py $d $o "$1"; rm -f $d
