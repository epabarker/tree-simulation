#!/bin/bash
# shade.sh TAG ROOF SEEDS : beech seedling under a shade-house roof (trials.ts shadeParams), 150 seasons; env SPPATCH.
R=/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170; D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
one() {
  out=$D/shade/$1-r$2-s$3; mkdir -p $out
  node $D/dumpstand.ts beech $3 shade:$2 > $out/params.json
  $R/rust/target/native/release/treesim --preset mixedWood --params $out/params.json --seasons 150 --snapshots 150 --quiet --out $out/run >/dev/null 2>$out/err || cat $out/err
  rm -f $out/run/form.csv $out/run/metamers.csv
}
export -f one; export R D
lo=${3%-*}; hi=${3#*-}
seq $lo $hi | xargs -P ${JOBS:-4} -I{} bash -c "one $1 $2 {}"
echo done-shade $1 $2
