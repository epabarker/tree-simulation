#!/usr/bin/env bash
# The crown-extent probe's runs (#129; EXPLORATORY, seeds 1-3): one arm through the feature probe
# (npm run probe), HEAD's runs linked from the `base` arm.
#
#   run.sh base                 HEAD alone: the six exemplars' lone trees and the garden
#   run.sh <arm> [lone|garden]  patches/<arm>.json against it (default: both stages; `garden`
#                               is the garden and hornbeam's lone trees, `lone` the other five)
#   run.sh <arm> screen         a calibration variant: hornbeam, beech and birch alone
#
# Lone: loneTreeParams, seasons 10..100. Garden: forestParams at 160 and 66 cells to season 300
# (rides on hornbeam's call). Output: runs/probe/129-<arm>-<species>/. At most 12 simulators.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
arm=$1
stage=${2:-both}
here=docs/experiments/code/2026-11-13-crown-extent
LONE=10,20,30,40,50,60,70,80,90,100
GARDEN=25,50,75,100,150,200,300

probe() { # species, then the stage's options
  local sp=$1
  shift
  local patch=()
  [ "$arm" = base ] || patch=(--patch "$here/patches/$arm.json" --head-from "129-base-$sp")
  node cli/probe.ts "${patch[@]}" --species "$sp" --label "129-$arm-$sp" --lone "$LONE" "$@" \
    2> >(grep -v '^probe: \(head\|patch\) ' >&2)
}

if [ "$stage" = screen ]; then # a calibration variant: three exemplars' lone trees only
  probe hornbeam --widths "" --jobs 3
  probe beech --widths "" --jobs 3
  probe birch --widths "" --jobs 3
  exit
fi
# The garden rides on hornbeam's call, so `lone` leaves hornbeam's label alone: the probe clears
# a label before it runs, and a lone-only hornbeam call would delete the arm's garden.
if [ "$stage" != lone ]; then
  probe hornbeam --widths 160,66 --garden "$GARDEN" --jobs 6 &
fi
if [ "$stage" != garden ]; then
  (probe oak --widths "" --jobs 3; probe maple --widths "" --jobs 3; probe holly --widths "" --jobs 3) &
  (probe beech --widths "" --jobs 3; probe birch --widths "" --jobs 3) &
fi
wait
