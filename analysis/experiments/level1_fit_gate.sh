#!/usr/bin/env bash
# Level 1 pilot (reference-fidelity phase 3; provisional, nothing accepted): the overnight fit, then its gate.
#
#   analysis/experiments/level1_fit_gate.sh SPECIES GENERATIONS MAX_HOURS
#   TREESIM_WORKERS=8 LEVEL1_OUT=level1-pilot-mac analysis/experiments/level1_fit_gate.sh ...   # another host / run
#
# GENERATIONS is the budget, set from the dry run's seconds a generation (the user, 2026-11-04): max-evals is
# GENERATIONS × 12 candidates × the registration's seeds per candidate (loss.seeds_per_candidate: 5 in v2, set by
# level1_noise.py in v3) plus the finalists' and the hand's re-measure (4 × 10 seeds). MAX_HOURS is the safety stop
# after the current generation. The log's first line of each launch names the commit (and "+dirty" if analysis/ has
# uncommitted changes). A killed run resumes from its checkpoint: run the same command again.
# The gate (seeds 1–20) reads docs/experiments/fits/level1-pilot/S.json, or S-best.json if the fit stopped early.
# LEVEL1_OUT (default level1-pilot) names the results and logs: docs/experiments/fits/$LEVEL1_OUT/, runs/$LEVEL1_OUT/
# (the second host's run goes beside the first's, never over it). TREESIM_WORKERS: analysis/experiments/host.sh.
# Logs: runs/level1-pilot/S.log, S.gate.txt, S.gate.json. analysis/ stays as committed while it runs: the registration
# refuses any hashed file that changed.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
cd "$here/../.."
export PATH="$HOME/.cargo/bin:$PATH"
. "$here/host.sh"
out=${LEVEL1_OUT:-level1-pilot}
s=${1:?species}
gens=${2:?generations}
hours=${3:?max hours}
seeds=$(uv run --project analysis python -I -c "import json, sys; n = json.load(open(sys.argv[1]))['loss']['seeds_per_candidate']; print(n if n else '')" "analysis/fit/sources/level1-$s.json")
[[ -n $seeds ]] || { echo "$s: the registration has no seeds_per_candidate (analysis/experiments/level1_noise.py)"; exit 1; }
evals=$((gens * 12 * seeds + 4 * 10))
commit=$(git rev-parse --short HEAD)
[[ -z $(git status --porcelain -- analysis) ]] || commit="$commit+dirty"
mkdir -p runs/$out
log=runs/$out/$s.log
echo "=== $s: commit $commit; $gens generations × 12 × $seeds seeds ($evals evaluations), ≤ $hours h; build:wasm $(date -Iseconds)" | tee -a "$log"
npm run build:wasm >>"$log" 2>&1 || { echo "build:wasm failed (see $log)"; exit 1; }
resume=()
[[ -f runs/$out/$s/checkpoint.pkl ]] && resume=(--resume)
echo "=== $s: fit ${resume[@]+"${resume[@]}"} $(date -Iseconds)" | tee -a "$log"
uv run --project analysis python -I analysis/experiments/level1_fit.py --species "$s" --max-evals "$evals" \
  --max-hours "$hours" --out "$out" --workers "$(treesim_workers)" ${resume[@]+"${resume[@]}"} >>"$log" 2>&1
status=$?
echo "=== $s: fit exit $status $(date -Iseconds)" | tee -a "$log"
# A failed fit is never gated: an older results file from a previous run may still be on disk.
if [[ $status -ne 0 ]]; then
  echo "$s: the fit failed (exit $status); no gate (see $log)" | tee -a "$log"
  exit "$status"
fi
fit=docs/experiments/fits/$out/$s.json
[[ -f $fit ]] || fit=docs/experiments/fits/$out/$s-best.json
if [[ ! -f $fit ]]; then
  echo "$s: no fit to gate ($(date -Iseconds))" | tee "runs/$out/$s.gate.txt"
  exit 1
fi
echo "=== $s: gate on $fit $(date -Iseconds)" | tee -a "$log"
uv run --project analysis python -I analysis/experiments/level1_gate.py --species "$s" --fit "$fit" --workers "$(treesim_workers)" \
  --json "runs/$out/$s.gate.json" >"runs/$out/$s.gate.txt" 2>&1
echo "=== $s: gate exit $? $(date -Iseconds): $(tail -n 1 "runs/$out/$s.gate.txt")" | tee -a "$log"
