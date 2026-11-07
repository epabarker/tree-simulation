#!/bin/bash
# lone.sh TAG SEEDS PATCHJSON : lone beech at 100/150 (cli/trials.ts loneParams via dumpp.ts), H, D, W/H per seed -> lone/TAG__seed.json
R=/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170; D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
mkdir -p $D/lone
one() {
  o=$D/lone/$1__$2.json; [ -f $o ] && exit 0
  d=$D/lone/tmp-$1__$2.json
  node $D/dumpp.ts $R beech $2 $d "$3" && cd $R && uv run -q --project analysis python -I $D/measure.py $d $o "$1"; rm -f $d
}
export -f one; export R D
lo=${2%-*}; hi=${2#*-}
seq $lo $hi | xargs -P ${JOBS:-4} -I{} bash -c "one $1 {} '$3'"
echo done-lone $1
