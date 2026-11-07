#!/bin/bash
# stand.sh TAG SEEDS : beech closed stand (trials.ts standParams), 150 seasons, snapshots 100,150; env SPPATCH. 4 at a time.
R=/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170; D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1/stand
one() {
  out=$D/runs/stand-$1-s$2; mkdir -p $out
  node $D/../dumpstand.ts beech $2 > $out/params.json
  $R/rust/target/native/release/treesim --preset mixedWood --params $out/params.json --seasons 150 --snapshots 100,150 --light --quiet --out $out/run >/dev/null 2>$out/err || cat $out/err
  rm -f $out/run/form.csv
}
export -f one; export R D
lo=${2%-*}; hi=${2#*-}
seq $lo $hi | xargs -P ${JOBS:-4} -I{} bash -c "one $1 {}"
echo done-stand $1
