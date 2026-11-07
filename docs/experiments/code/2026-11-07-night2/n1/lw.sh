#!/bin/bash
# lw.sh TAG SEED [SNAPS] : layered wood (spacing 21, depth 24, periodic, recruits 0.25), 150 seasons. env SPPATCH passes through.
R=/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170; D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
out=$D/runs/$1-s$2; mkdir -p $out
LAYERED=1 SIDESZ=periodic node $D/filldump.ts $2 0 0.25 21 24 > $out/params.json
$R/rust/target/native/release/treesim --preset mixedWood --params $out/params.json --seasons ${SEASONS:-150} --snapshots ${3:-150} --quiet --out $out/run >/dev/null 2>$out/err || cat $out/err
rm -f $out/run/form.csv
