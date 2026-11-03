#!/usr/bin/env bash
# Girth set G (2026-11-03): the stands at 100 under the candidate's view (&interior; beech also
# &bark=pale), at girth k 1, 1.2 and 1.45. Tags end in k12 or k145.
#   render-girth.sh <origin> <out>
set -euo pipefail
here=$(dirname "$0"); origin=$1; out=$2; export SEEDS=1,2,3 TRIALS=stand100
run() { TAG=$1 SOURCES=$2 VIEW=$3 node "$here/shots.mjs" "$origin" "$out" 3; }
for k in 1 1.2 1.45; do
  sfx=$([ "$k" = 1 ] && echo "" || echo "k${k/./}")
  g=$([ "$k" = 1 ] && echo "" || echo "&girth=$k")
  run "beechC$sfx" beech "&bark=pale&interior$g"
  for s in hornbeam oak birch; do run "${s}I$sfx" "$s" "&interior$g"; done
done
