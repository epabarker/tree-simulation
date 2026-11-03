#!/usr/bin/env bash
# Level 0's overnight sweep (reference-fidelity phase 2, the plan's §k): one fit per species, one after another, each
# writing docs/experiments/fits/level0/<species>.json (+ -progress.csv, -best.json after every generation) and its log
# to runs/level0/<species>.log. The user runs it; a session never launches it.
#
#   analysis/experiments/level0_sweep.sh [max-evals per species] [max-hours per species] [workers] [species ...]
#
# Budget (the beech dry run, 2026-11-03, i7-1260P): 8.8 s wall an evaluation on 12 workers (6 workers: 137 s against
# 101 s for the same 20; 12 it is). The default 420 evaluations is ≈ 62 min a species and ≈ 10.3 h for all ten: 6
# generations of 12 candidates × 5 seeds plus the finalists' 60. Thin for 7 knobs; to go deeper, name fewer
# species a night (e.g. `level0_sweep.sh 1200 3 12 beech oak birch`).
#
# A species with a results file is skipped; one stopped by --max-hours or killed resumes from its checkpoint on the
# next invocation (--resume is passed whenever a checkpoint exists). Then run the gate per species:
#   uv run --project analysis python -I analysis/experiments/level0_gate.py --species S \
#       --fit docs/experiments/fits/level0/S.json
# and, before any fitted params are accepted, the gallery regression and shapeFlag (the plan's §k).
set -uo pipefail
cd "$(dirname "$0")/../.."
export PATH="$HOME/.cargo/bin:$PATH"

MAX_EVALS="${1:-420}"
MAX_HOURS="${2:-1.25}"
WORKERS="${3:-12}"
# The garden's eight first (beech, the phase-3 species, leading), then the lab's two conifers.
SPECIES=(beech oak birch hornbeam maple rowan willow holly fir pine)
if (($# > 3)); then SPECIES=("${@:4}"); fi

npm run build:wasm >/dev/null || { echo "build:wasm failed"; exit 1; }
mkdir -p runs/level0
for s in "${SPECIES[@]}"; do
  if [[ -f "docs/experiments/fits/level0/$s.json" ]]; then
    echo "$s: done, skipped"
    continue
  fi
  resume=()
  [[ -f "runs/level0/$s/checkpoint.pkl" ]] && resume=(--resume)
  echo "$s: start $(date -Is) (max-evals $MAX_EVALS, max-hours $MAX_HOURS)"
  uv run --project analysis python -I analysis/experiments/level0_fit.py --species "$s" \
    --max-evals "$MAX_EVALS" --max-hours "$MAX_HOURS" --workers "$WORKERS" "${resume[@]}" \
    2>&1 | tee -a "runs/level0/$s.log"
  echo "$s: end $(date -Is)"
done
