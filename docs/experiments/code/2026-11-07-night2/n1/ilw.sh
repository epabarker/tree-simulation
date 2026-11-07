#!/bin/bash
# ilw.sh TAG SEED : the layered wood with the instrumented binary; stderr N1 lines -> $out/n1.txt. env SPPATCH.
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
out=$D/iruns/$1-s$2; mkdir -p $out
LAYERED=1 SIDESZ=periodic node $D/filldump.ts $2 0 0.25 21 24 > $out/params.json
$D/itarget/release/treesim --preset mixedWood --params $out/params.json --seasons 150 --snapshots 150 --quiet --out $out/run >/dev/null 2>$out/n1.txt
rm -f $out/run/form.csv $out/run/metamers.csv
