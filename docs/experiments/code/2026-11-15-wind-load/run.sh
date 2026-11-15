#!/usr/bin/env bash
# #133's wind-load probe (EXPLORATORY, seeds 1-3): one arm through the feature probe (npm run probe),
# HEAD's runs linked from the crown-extent probe's `base` (129-base-<species>, reproduced bit for
# bit at 0e2a1ea: lone hornbeam seed 1 hashes 859812b6 at both).
#
#   run.sh <arm>        patches/<arm>.json against HEAD: lone beech, hornbeam, birch and holly
#                       (seasons 10..100), and the garden at 160 cells to season 300 (on hornbeam's
#                       call, so hornbeam's label holds both)
#   run.sh all          every arm in patches/, one after another
#
# Output: runs/probe/133-<arm>-<species>/. At most 12 simulators (6 garden + 3 + 3 lone).
set -euo pipefail
cd "$(dirname "$0")/../../../.."
here=docs/experiments/code/2026-11-15-wind-load
LONE=10,20,30,40,50,60,70,80,90,100
GARDEN=25,50,75,100,150,200,300

if [ "$1" = all ]; then
  for f in "$here"/patches/*.json; do "$0" "$(basename "$f" .json)"; done
  exit
fi
arm=$1

probe() { # species, then the stage's options
  local sp=$1
  shift
  node cli/probe.ts --patch "$here/patches/$arm.json" --head-from "129-base-$sp" --species "$sp" \
    --label "133-$arm-$sp" --lone "$LONE" "$@" 2> >(grep -v '^probe: \(head\|patch\) ' >&2)
}

probe hornbeam --widths 160 --garden "$GARDEN" --jobs 6 &
(probe beech --widths "" --jobs 3; probe birch --widths "" --jobs 3) &
(probe holly --widths "" --jobs 3) &
wait
