#!/usr/bin/env bash
# Level 0 v2 (docs/experiments/2026-11-03-level0-targets.md): each species' fit, then its gate, one species after another;
# the next species starts whether the gate passed or failed. Night 1's budgets (the plan's §k): 1200 evaluations, 12
# workers, 3.5 h a species.
#
#   analysis/experiments/level0_fit_gate.sh beech oak birch
#
# The fit is level0_sweep.sh's (build:wasm, skip a species with a results file, resume from a checkpoint, the log
# runs/level0/S.log). The gate (level0_gate.py, seeds 1–20) reads docs/experiments/fits/level0/S.json, or S-best.json
# when the fit stopped early, and writes runs/level0/S.gate.txt (and S.gate.json). The targets are read when each gate
# starts, hours after launch: analysis/ stays as committed while it runs.
set -uo pipefail
cd "$(dirname "$0")/../.."
export PATH="$HOME/.cargo/bin:$PATH"
mkdir -p runs/level0
for s in "$@"; do
  echo "=== $s: fit $(date -Is)"
  analysis/experiments/level0_sweep.sh 1200 3.5 12 "$s"
  fit=docs/experiments/fits/level0/$s.json
  [[ -f $fit ]] || fit=docs/experiments/fits/level0/$s-best.json
  if [[ ! -f $fit ]]; then
    echo "$s: no fit to gate ($(date -Is))" | tee "runs/level0/$s.gate.txt"
    continue
  fi
  echo "=== $s: gate on $fit $(date -Is)"
  uv run --project analysis python -I analysis/experiments/level0_gate.py --species "$s" --fit "$fit" --workers 12 \
    --json "runs/level0/$s.gate.json" >"runs/level0/$s.gate.txt" 2>&1
  echo "=== $s: gate exit $? $(date -Is): $(tail -n 1 "runs/level0/$s.gate.txt")"
done
echo "=== done $(date -Is)"
