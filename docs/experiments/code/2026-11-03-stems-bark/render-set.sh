#!/usr/bin/env bash
# One set's renders (2026-11-03): every condition's plates into <out>, named by TAG.
#   render-set.sh <origin> <out> [seeds]   (seeds: a comma list; 1,2,3 for D, 4,5,6 for J)
set -euo pipefail
here=$(dirname "$0"); origin=$1; out=$2; export SEEDS=${3:-1,2,3}
run() { TAG=$1 SOURCES=$2 VIEW=$3 TRIALS=${4:-} node "$here/shots.mjs" "$origin" "$out" 3; }
# The baseline: HEAD's defaults (beech's measured bark).
for s in hornbeam oak birch; do run "$s" "$s" ""; done
run beechM beech ""
# Beech under its former pale grey, and the candidate: the pale grey with the backdrop.
run beechP beech "&bark=pale"
run beechC beech "&bark=pale&interior"
# The backdrop on the measured bark, and on every decoy's stand (their lone plates have none).
run beechMI beech "&interior" stand100
for s in hornbeam oak birch; do run "${s}I" "$s" "&interior" stand100; done
