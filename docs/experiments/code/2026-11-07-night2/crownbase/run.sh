#!/bin/bash
# run.sh KIND ARG SEED : KIND garden (ARG = faces value) | stand (ARG = species)
R=/home/edbarker/Documents/Projects/tree-simulation; D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/crownbase
K=$1; A=$2; S=$3; out=$D/runs/$K-$A-s$S; mkdir -p $out
if [ $K = narrow ]; then
  node $R/docs/experiments/code/2026-11-06-overnight/evidence/dump.ts $R 160 $S > $out/params.json
  python3 -c "
import json; p=json.load(open('$out/params.json')); p['world']['faceWood']=$A; p['world']['depth']=28
for t in p['trees']: t['z']=14
p['o4']['band']=28; json.dump(p,open('$out/params.json','w'))"
  pre=mixedWood
elif [ $K = wood ]; then
  node $R/docs/experiments/code/2026-11-06-overnight/evidence/dump.ts $R 160 $S > $out/params.json
  python3 -c "import json,sys; p=json.load(open('$out/params.json')); p['world']['faceWood']=$A; json.dump(p,open('$out/params.json','w'))"
  pre=mixedWood
elif [ $K = garden ]; then
  node $R/docs/experiments/code/2026-11-06-overnight/evidence/dump.ts $R 160 $S > $out/params.json
  python3 -c "import json,sys; p=json.load(open('$out/params.json')); p['world']['faces']=[$A,$A]; json.dump(p,open('$out/params.json','w'))"
  pre=mixedWood
else
  node $D/dumpstand.ts $A $S > $out/params.json; pre=mixedWood
fi
$R/rust/target/native/release/treesim --preset $pre --params $out/params.json --seasons 150 --snapshots 60,100,150 --quiet --out $out/run >/dev/null 2>$out/err || cat $out/err
