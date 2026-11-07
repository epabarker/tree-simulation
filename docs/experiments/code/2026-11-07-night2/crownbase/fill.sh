#!/bin/bash
# fill.sh TAG WOOD RECRUITS SPACING DEPTH SEED
R=/home/edbarker/Documents/Projects/tree-simulation; D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/crownbase
out=$D/runs/$1-x-s$6; mkdir -p $out
node $D/filldump.ts $6 $2 $3 $4 $5 > $out/params.json
$R/rust/target/native/release/treesim --preset mixedWood --params $out/params.json --seasons 150 --snapshots 60,100,150 --quiet --out $out/run >/dev/null 2>$out/err || cat $out/err
