#!/bin/bash
# fillF.sh RUNS TAG WOOD RECRUITS SPACING DEPTH SEED [PATCH.json] : garden 150 seasons, snapshots, diag lines.
# TAG must not contain '-'. With PATCH (format {species|"*": {"dotted.path": value}}) applied after the dump.
R=/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-a28199a6f8557d21d
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/F
out=$1/runs/$2-x-s$7; mkdir -p $out
node $D/filldump.ts $7 $3 $4 $5 $6 > $out/params.json
if [ -n "$8" ]; then python3 $D/patch.py $out/params.json $8; fi
TREESIM_DIAG=1 $R/rust/target/native/release/treesim --preset mixedWood --params $out/params.json --seasons ${SEASONS:-150} --snapshots 60,100,150 --quiet --out $out/run >/dev/null 2>$out/diag.txt || tail -3 $out/diag.txt
grep -v '^SHED' $out/diag.txt | head -3
