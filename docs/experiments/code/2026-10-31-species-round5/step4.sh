#!/usr/bin/env bash
# Overnight step 4 (2026-11-01): the form sweep and the grids under ADR 0032 (tag -adr32), every grid
# cell's closed stand at 100 and a pick per species (grid-stand.py), the picks regrown at seeds 1–3.
#   systemd-inhibit --what=sleep:idle --why="tree-sim overnight" bash docs/experiments/code/2026-10-31-species-round5/step4.sh > runs/step4.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/../../../.."
export PATH="$HOME/.cargo/bin:$PATH"
D=docs/experiments/code/2026-10-31-species-round5
PY="uv run --project analysis python"
SPECIES="beech hornbeam birch oak maple willow rowan holly"
for sp in $SPECIES; do echo "== sweep $sp $(date +%T)"; $PY $D/form-sweep.py $sp --workers 12 --tag=-adr32; done
for sp in $SPECIES; do echo "== grid $sp $(date +%T)"; $PY $D/form-grid.py $sp --workers 12 --tag=-adr32; done
for sp in $SPECIES; do [ $sp = beech ] && continue; echo "== stand $sp $(date +%T)"; $PY $D/grid-stand.py $sp --tag=-adr32 --workers 12; done
for sp in $SPECIES; do echo "== picks $sp $(date +%T)"; $PY $D/form-picks.py $sp --workers 12 --from-grid=-adr32; done
echo "== done $(date +%T)"
