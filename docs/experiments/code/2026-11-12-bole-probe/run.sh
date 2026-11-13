#!/usr/bin/env bash
# Runs the #126 probe's params through the bole_limbs example, at most JOBS at once (default 4).
# Usage: run.sh <pattern> <seasons> [jobs]   e.g. run.sh 'garden-head-*' 150
# Reads runs/bole126/params/<pattern>.json; writes runs/bole126/out/<name>.csv and a timing line.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
pattern=$1 seasons=$2 jobs=${3:-4}
bin=runs/bole126/bole_limbs
mkdir -p runs/bole126/out
ls runs/bole126/params/$pattern.json | xargs -P "$jobs" -I{} sh -c '
  n=$(basename {} .json)
  [ -s runs/bole126/out/$n.csv ] && exit 0
  t0=$(date +%s)
  '"$bin"' {} '"$seasons"' runs/bole126/out/$n.csv.tmp && mv runs/bole126/out/$n.csv.tmp runs/bole126/out/$n.csv
  echo "$n $(( $(date +%s) - t0 ))s" >> runs/bole126/out/timing.txt'
