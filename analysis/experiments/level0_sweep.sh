#!/usr/bin/env bash
# Level 0's overnight sweep (reference-fidelity phase 2, the plan's §k): one fit per species, one after another, each
# writing docs/experiments/fits/level0/<species>.json (+ -progress.csv, -best.json after every generation) and its log
# to runs/level0/<species>.log. The user runs it; a session never launches it.
#
#   analysis/experiments/level0_sweep.sh night1|night2|night3        # the plan (the user, 2026-11-03)
#   analysis/experiments/level0_sweep.sh MAX_EVALS MAX_HOURS WORKERS SPECIES...
#
# The plan: deep on three a night, not thin on ten (the user, 2026-11-03).
#   night1: beech, oak, birch          1200 evaluations each, ≈ 2.9 h each, ≈ 8.6 h
#   night2: hornbeam, maple, pine, fir  900 evaluations each, ≈ 2.2 h each, ≈ 8.6 h (four species: 1200 would be 11.5 h)
#   night3: willow, rowan, holly       1200 evaluations each, ≈ 8.6 h
# MAX_HOURS is a safety stop per species and per invocation, ≈ 1.2 × the expected time.
#
# Workers: 12. Wall per evaluation on the beech smoke config (lone + stand to 150 + shade house, 2026-11-03, i7-1260P,
# RAPL 64 W, performance governor): 1 worker 26.2 s, 2 19.1, 4 13.4, 6 10.6, 8 9.2, 12 8.6. The knee is 6–8; 12 is
# still the fastest (8 gives 93% of its throughput, for a machine also in use). Each evaluation slows 1.46× with only
# two workers: the chip's power budget, not cores. Over 99% of an evaluation is the core's seasons; Node and the WASM
# load once per worker (fit.py's Pool keeps one process each), so no fixed cost is left to remove there.
#
# A species with a results file is skipped; one stopped by --max-hours or killed resumes from its checkpoint on the
# next invocation (--resume is passed whenever a checkpoint exists). Then run the gate per species:
#   uv run --project analysis python -I analysis/experiments/level0_gate.py --species S \
#       --fit docs/experiments/fits/level0/S.json
# and, before any fitted params are accepted, the gallery regression and shapeFlag (the plan's §k).
set -uo pipefail
cd "$(dirname "$0")/../.."
export PATH="$HOME/.cargo/bin:$PATH"

WORKERS=12
case "${1:-}" in
  night1) MAX_EVALS=1200; MAX_HOURS=3.5; SPECIES=(beech oak birch) ;;
  night2) MAX_EVALS=900; MAX_HOURS=2.75; SPECIES=(hornbeam maple pine fir) ;;
  night3) MAX_EVALS=1200; MAX_HOURS=3.5; SPECIES=(willow rowan holly) ;;
  *)
    if (($# < 4)); then
      echo "usage: $0 night1|night2|night3 | MAX_EVALS MAX_HOURS WORKERS SPECIES..." >&2
      exit 2
    fi
    MAX_EVALS="$1"; MAX_HOURS="$2"; WORKERS="$3"; SPECIES=("${@:4}") ;;
esac

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
