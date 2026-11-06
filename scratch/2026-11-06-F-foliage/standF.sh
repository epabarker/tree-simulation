#!/bin/bash
# standF.sh RUNS SPECIES SEED : the closed stand (cli/trials.ts standParams), 150 seasons, diag lines.
R=/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-a28199a6f8557d21d
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/F
out=$1/runs/stand-$2-s$3; mkdir -p $out
node $D/dumpstand.ts $2 $3 > $out/params.json
TREESIM_DIAG=1 $R/rust/target/native/release/treesim --preset mixedWood --params $out/params.json --seasons 150 --snapshots 60,100,150 --quiet --out $out/run >/dev/null 2>$out/diag.txt || tail -3 $out/diag.txt
